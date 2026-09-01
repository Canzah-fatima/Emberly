const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadBuffer, deleteAsset } = require('../lib/cloudinary');
const realtime = require('../lib/realtime');

const router = express.Router();
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 60;
const MAX_MESSAGE_MEDIA = 1;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_MESSAGE_MEDIA, fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp|avif)$/i.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/i.test(file.mimetype)) return cb(null, true);
    const error = new Error('Supported message media: JPG, PNG, GIF, WEBP, AVIF, MP4, MOV or WebM.');
    error.status = 400;
    cb(error);
  },
});

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    avatarColor: row.avatar_color,
    avatarUrl: row.avatar_url,
  };
}

function isMember(conversationId, userId) {
  return !!db.prepare(`
    SELECT 1 FROM conversation_members
    WHERE conversation_id = ? AND user_id = ?
  `).get(conversationId, userId);
}

function serializeSharedPost(post) {
  if (!post) return null;
  const media = db.prepare(`
    SELECT url, resource_type FROM post_media
    WHERE post_id = ? ORDER BY position ASC LIMIT 1
  `).get(post.id);
  const author = db.prepare(`
    SELECT username, full_name, avatar_url FROM users WHERE id = ?
  `).get(post.user_id);
  return {
    id: post.id,
    caption: post.caption || '',
    imageUrl: media?.url || post.image_url || null,
    resourceType: media?.resource_type || 'image',
    author: author ? { username: author.username, fullName: author.full_name, avatarUrl: author.avatar_url } : null,
  };
}

function canViewPost(post, viewerId) {
  if (!post || !viewerId) return false;
  if (post.user_id === viewerId) return true;
  const owner = db.prepare('SELECT is_private FROM users WHERE id = ?').get(post.user_id);
  if (!owner?.is_private) return true;
  return !!db.prepare(`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND status = 'accepted'`).get(viewerId, post.user_id);
}

function serializeMessage(row, viewerId) {
  const sender = db.prepare('SELECT id, username, full_name, avatar_color, avatar_url FROM users WHERE id = ?').get(row.sender_id);
  const rawPost = row.shared_post_id ? db.prepare('SELECT * FROM posts WHERE id = ?').get(row.shared_post_id) : null;
  const post = rawPost && canViewPost(rawPost, viewerId) ? rawPost : null;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    sender: publicUser(sender),
    sharedPost: serializeSharedPost(post),
    media: row.media_url ? {
      url: row.media_url,
      resourceType: row.media_resource_type || 'image',
      format: row.media_format || null,
    } : null,
  };
}

function encodeCursor(row) {
  if (!row?.created_at || !row?.id) return null;
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id }), 'utf8').toString('base64url');
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!parsed?.createdAt || !parsed?.id) return null;
    return { createdAt: String(parsed.createdAt), id: String(parsed.id) };
  } catch { return null; }
}

function getConversation(conversationId, viewerId) {
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conversation || !isMember(conversationId, viewerId)) return null;
  const members = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_color, u.avatar_url
    FROM conversation_members cm JOIN users u ON u.id = cm.user_id
    WHERE cm.conversation_id = ?
    ORDER BY u.username ASC
  `).all(conversationId);
  const other = members.find((m) => m.id !== viewerId) || members[0] || null;
  const last = db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(conversationId);
  const unread = db.prepare(`
    SELECT COUNT(*) AS c FROM messages
    WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL
  `).get(conversationId, viewerId).c;
  return {
    id: conversation.id,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    user: publicUser(other),
    lastMessage: last ? serializeMessage(last, viewerId) : null,
    unreadCount: unread,
  };
}

router.get('/unread-count', requireAuth, (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(*) AS c
    FROM messages m
    JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?
    WHERE m.sender_id != ? AND m.read_at IS NULL
  `).get(req.userId, req.userId).c;
  res.json({ count });
});

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.updated_at DESC
    LIMIT 100
  `).all(req.userId);
  res.json({ conversations: rows.map((row) => getConversation(row.id, req.userId)).filter(Boolean) });
});

router.post('/', requireAuth, (req, res) => {
  const targetId = String(req.body.userId || '').trim();
  const username = String(req.body.username || '').trim().toLowerCase();
  const target = targetId
    ? db.prepare('SELECT id, username, full_name, avatar_color, avatar_url FROM users WHERE id = ?').get(targetId)
    : db.prepare('SELECT id, username, full_name, avatar_color, avatar_url FROM users WHERE username = ?').get(username);

  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.userId) return res.status(400).json({ error: 'You cannot message yourself.' });

  const existing = db.prepare(`
    SELECT c.id
    FROM conversations c
    JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
    JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?
    WHERE (SELECT COUNT(*) FROM conversation_members x WHERE x.conversation_id = c.id) = 2
    LIMIT 1
  `).get(req.userId, target.id);

  if (existing) return res.json({ conversation: getConversation(existing.id, req.userId) });

  /*
   * Deterministic IDs make 1:1 conversation creation idempotent under
   * concurrent requests. The previous random UUID approach could allow two
   * simultaneous "start chat" requests to create duplicate conversations.
   */
  const pair = [req.userId, target.id].sort();
  const conversationId = `dm_${crypto.createHash('sha256').update(pair.join(':')).digest('hex').slice(0, 40)}`;

  try {
    const create = db.transaction(() => {
      const existingConversation = db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
      if (existingConversation) return false;
      db.prepare('INSERT INTO conversations (id) VALUES (?)').run(conversationId);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(conversationId, pair[0]);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(conversationId, pair[1]);
      return true;
    });
    const created = create();
    return res.status(created ? 201 : 200).json({ conversation: getConversation(conversationId, req.userId) });
  } catch (error) {
    /* Another request may have won the deterministic-ID race. */
    const existing = db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId);
    if (existing) return res.json({ conversation: getConversation(conversationId, req.userId) });
    console.error('Conversation creation failed:', error);
    return res.status(500).json({ error: 'Could not start the conversation.' });
  }
});

router.get('/:id/messages', requireAuth, (req, res) => {
  if (!isMember(req.params.id, req.userId)) return res.status(403).json({ error: 'You are not part of this conversation.' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), MAX_MESSAGES);
  const before = decodeCursor(req.query.before);
  const rows = before
    ? db.prepare(`SELECT * FROM messages WHERE conversation_id = ? AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT ?`).all(req.params.id, before.createdAt, before.createdAt, before.id, limit + 1)
    : db.prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`).all(req.params.id, limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  res.json({ messages: page.reverse().map((row) => serializeMessage(row, req.userId)), hasMore, nextBefore: hasMore ? encodeCursor(page[0]) : null });
});

router.post('/:id/read', requireAuth, (req, res) => {
  if (!isMember(req.params.id, req.userId)) return res.status(403).json({ error: 'You are not part of this conversation.' });
  const result = db.prepare(`
    UPDATE messages SET read_at = datetime('now')
    WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL
  `).run(req.params.id, req.userId);
  const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(req.params.id, req.userId);
  if (result.changes) realtime.broadcastRead(req.params.id, recipients.map((item) => item.user_id), new Date().toISOString());
  res.json({ success: true });
});

router.post('/:id/messages', requireAuth, upload.single('media'), async (req, res) => {
  if (!isMember(req.params.id, req.userId)) return res.status(403).json({ error: 'You are not part of this conversation.' });
  const body = String(req.body.body || '').trim().slice(0, MAX_MESSAGE_LENGTH);
  const sharedPostId = String(req.body.sharedPostId || '').trim() || null;
  const media = req.file || null;
  if (!body && !sharedPostId && !media) return res.status(400).json({ error: 'Write a message, attach media, or choose a post to share.' });

  let post = null;
  if (sharedPostId) {
    post = db.prepare('SELECT * FROM posts WHERE id = ?').get(sharedPostId);
    if (!post || !canViewPost(post, req.userId)) return res.status(404).json({ error: 'That post is not available to share.' });
    const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(req.params.id, req.userId);
    if (recipients.some((recipient) => !canViewPost(post, recipient.user_id))) {
      return res.status(403).json({ error: 'That post is not visible to everyone in this conversation.' });
    }
  }

  const id = uuidv4();
  let uploaded = null;
  try {
    if (media) {
      const resourceType = media.mimetype.startsWith('video/') ? 'video' : 'image';
      uploaded = await uploadBuffer(media.buffer, { folder: 'emberly/messages', resourceType });
    }
    const create = db.transaction(() => {
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, body, shared_post_id, media_url, media_public_id, media_resource_type, media_format)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.params.id, req.userId, body, sharedPostId, uploaded?.secure_url || uploaded?.url || null, uploaded?.public_id || null, uploaded ? (media.mimetype.startsWith('video/') ? 'video' : 'image') : null, uploaded?.format || null);
      db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    });
    create();
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    const serialized = serializeMessage(message, req.userId);
    const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?').all(req.params.id);
    realtime.broadcastToConversation(req.params.id, recipients.map((item) => item.user_id), serialized);
    return res.status(201).json({ message: serialized });
  } catch (error) {
    if (uploaded?.public_id) await deleteAsset(uploaded.public_id, media?.mimetype.startsWith('video/') ? 'video' : 'image').catch(() => {});
    console.error('Message send failed:', error);
    return res.status(error.status || 500).json({ error: error.status === 503 ? error.message : 'Message could not be sent.' });
  }
});

module.exports = router;
