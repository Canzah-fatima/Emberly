const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { notify } = require('../lib/notify');
const multer = require('multer');
const { uploadBuffer, deleteAsset } = require('../lib/cloudinary');

const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) return cb(null, true);
    const error = new Error('Profile picture must be a JPG, PNG, WEBP, or AVIF image.');
    error.status = 400;
    cb(error);
  },
});

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    bio: u.bio,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url,
    isPrivate: !!u.is_private,
    createdAt: u.created_at,
  };
}

router.get('/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const rows = db.prepare(`
    SELECT id, username, full_name, bio, avatar_color, avatar_url, is_private, created_at
    FROM users
    WHERE id != ?
      AND (? = '' OR lower(username) LIKE ? OR lower(full_name) LIKE ?)
    ORDER BY CASE WHEN ? <> '' AND lower(username) = ? THEN 0 WHEN ? <> '' AND lower(username) LIKE ? THEN 1 ELSE 2 END, username ASC
    LIMIT 20
  `).all(req.userId, q, `%${q}%`, `%${q}%`, q, q, q, `${q}%`);
  res.json({ users: withRelationship(rows, req.userId) });
});

// Pending follow requests addressed to me (must be before /:username to avoid collision)
router.get('/me/follow-requests', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, f.id as follow_id, f.created_at as requested_at
    FROM follows f JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.userId);
  res.json({
    requests: rows.map((r) => ({ ...publicUser(r), followId: r.follow_id, requestedAt: r.requested_at })),
  });
});

router.post('/me/follow-requests/:username/accept', requireAuth, (req, res) => {
  const requester = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!requester) return res.status(404).json({ error: 'User not found.' });
  const fr = db.prepare(`SELECT * FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'pending'`)
    .get(requester.id, req.userId);
  if (!fr) return res.status(404).json({ error: 'No pending request from this user.' });

  db.prepare(`UPDATE follows SET status = 'accepted' WHERE id = ?`).run(fr.id);
  notify({ recipientId: requester.id, actorId: req.userId, type: 'follow_accept' });
  res.json({ success: true });
});

router.post('/me/follow-requests/:username/decline', requireAuth, (req, res) => {
  const requester = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!requester) return res.status(404).json({ error: 'User not found.' });
  db.prepare(`DELETE FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'pending'`)
    .run(requester.id, req.userId);
  res.json({ success: true });
});

router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const postCount = db.prepare('SELECT COUNT(*) c FROM posts WHERE user_id = ?').get(user.id).c;
  const followerCount = db.prepare(`SELECT COUNT(*) c FROM follows WHERE following_id = ? AND status = 'accepted'`).get(user.id).c;
  const followingCount = db.prepare(`SELECT COUNT(*) c FROM follows WHERE follower_id = ? AND status = 'accepted'`).get(user.id).c;

  let relationship = 'none'; // none | following | requested
  const isSelf = req.userId === user.id;
  if (req.userId && !isSelf) {
    const f = db.prepare('SELECT status FROM follows WHERE follower_id = ? AND following_id = ?')
      .get(req.userId, user.id);
    if (f) relationship = f.status === 'pending' ? 'requested' : 'following';
  }

  const canViewContent = isSelf || !user.is_private || relationship === 'following';

  const posts = canViewContent
    ? db.prepare(`
        SELECT p.*,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
        FROM posts p WHERE p.user_id = ? ORDER BY p.created_at DESC
      `).all(user.id)
    : [];

  res.json({
    user: publicUser(user),
    postCount,
    followerCount,
    followingCount,
    relationship,
    isSelf,
    canViewContent,
    posts: posts.map(p => ({
      id: p.id,
      imageUrl: db.prepare('SELECT url FROM post_media WHERE post_id = ? ORDER BY position ASC LIMIT 1').get(p.id)?.url || p.image_url || null,
      media: db.prepare('SELECT id, url, resource_type as resourceType, width, height, position FROM post_media WHERE post_id = ? ORDER BY position ASC').all(p.id),
      caption: p.caption,
      createdAt: p.created_at,
      likeCount: p.like_count,
      commentCount: p.comment_count,
    })),
  });
});

router.post('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.userId) return res.status(400).json({ error: "You can't follow yourself." });

  const existing = db.prepare('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(req.userId, target.id);

  if (existing) {
    // Toggling off — works whether it was accepted or a pending request (cancel request)
    db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
    return res.json({ relationship: 'none' });
  }

  if (target.is_private) {
    db.prepare('INSERT INTO follows (id, follower_id, following_id, status) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), req.userId, target.id, 'pending');
    notify({ recipientId: target.id, actorId: req.userId, type: 'follow_request' });
    return res.json({ relationship: 'requested' });
  }

  db.prepare('INSERT INTO follows (id, follower_id, following_id, status) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), req.userId, target.id, 'accepted');
  notify({ recipientId: target.id, actorId: req.userId, type: 'follow' });
  res.json({ relationship: 'following' });
});

router.put('/me', requireAuth, (req, res) => {
  const { fullName, bio, isPrivate } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('UPDATE users SET full_name = ?, bio = ?, is_private = ? WHERE id = ?')
    .run(
      fullName ?? user.full_name,
      bio ?? user.bio,
      isPrivate === undefined ? user.is_private : (isPrivate ? 1 : 0),
      req.userId
    );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: publicUser(updated) });
});

router.put('/me/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a profile picture.' });

    const user = db.prepare('SELECT id, avatar_url, avatar_public_id FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const asset = await uploadBuffer(req.file.buffer, {
      folder: 'emberly/avatars',
      resourceType: 'image',
    });

    db.prepare('UPDATE users SET avatar_url = ?, avatar_public_id = ? WHERE id = ?')
      .run(asset.secure_url, asset.public_id, req.userId);

    if (user.avatar_public_id && user.avatar_public_id !== asset.public_id) {
      await deleteAsset(user.avatar_public_id, 'image').catch(() => {});
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    res.json({ user: publicUser(updated) });
  } catch (error) {
    next(error);
  }
});

router.put('/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.userId);
  res.json({ success: true });
});

function withRelationship(rows, viewerId) {
  return rows.map((u) => {
    let relationship = 'none';
    if (viewerId && viewerId !== u.id) {
      const f = db.prepare('SELECT status FROM follows WHERE follower_id = ? AND following_id = ?').get(viewerId, u.id);
      if (f) relationship = f.status === 'pending' ? 'requested' : 'following';
    }
    return { ...publicUser(u), relationship, isSelf: viewerId === u.id };
  });
}

router.get('/:username/followers', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const rows = db.prepare(`
    SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ? AND f.status = 'accepted' ORDER BY f.created_at DESC
  `).all(user.id);
  res.json({ users: withRelationship(rows, req.userId) });
});

router.get('/:username/following', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const rows = db.prepare(`
    SELECT u.* FROM follows f JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ? AND f.status = 'accepted' ORDER BY f.created_at DESC
  `).all(user.id);
  res.json({ users: withRelationship(rows, req.userId) });
});

module.exports = router;
