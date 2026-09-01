const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadBuffer, deleteAsset } = require('../lib/cloudinary');

const router = express.Router();

const storyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) return cb(null, true);
    const error = new Error('Stories support image or video files.');
    error.status = 400;
    cb(error);
  },
});

async function purgeExpired() {
  const expired = db.prepare(`
    SELECT id, public_id, resource_type FROM stories
    WHERE expires_at <= datetime('now')
  `).all();

  if (!expired.length) return;

  // Only remove a row after its remote asset has been deleted (or when
  // there is no remote asset). This prevents cleanup failures from creating
  // silent Cloudinary orphans.
  for (const story of expired) {
    if (!story.public_id) {
      db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
      continue;
    }
    try {
      await deleteAsset(story.public_id, story.resource_type || 'image');
      db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
    } catch (error) {
      console.error(`Could not delete expired story asset ${story.id}:`, error);
    }
  }
}

function canViewStory(story, viewerId) {
  if (!story || !viewerId) return false;
  if (story.user_id === viewerId) return true;
  const owner = db.prepare('SELECT is_private FROM users WHERE id = ?').get(story.user_id);
  if (!owner) return false;
  if (!owner.is_private) return true;
  return !!db.prepare(`
    SELECT 1 FROM follows
    WHERE follower_id = ? AND following_id = ? AND status = 'accepted'
  `).get(viewerId, story.user_id);
}

function serializeStory(row, viewerId) {
  const viewed = !!db.prepare(
    'SELECT id FROM story_views WHERE story_id = ? AND user_id = ?'
  ).get(row.id, viewerId || '');
  return {
    id: row.id,
    mediaUrl: row.media_url,
    resourceType: row.resource_type,
    caption: row.caption || '',
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewed,
    author: {
      id: row.user_id,
      username: row.username,
      fullName: row.full_name,
      avatarColor: row.avatar_color,
      avatarUrl: row.avatar_url,
    },
  };
}

// Return only active stories from the viewer and accepted connections.
// Own stories are always visible.
router.get('/feed', requireAuth, async (req, res, next) => {
  try {
    await purgeExpired();
  const rows = db.prepare(`
    SELECT s.*, u.username, u.full_name, u.avatar_color, u.avatar_url
    FROM stories s
    JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > datetime('now')
      AND (
        s.user_id = ?
        OR EXISTS (
          SELECT 1 FROM follows f
          WHERE f.follower_id = ? AND f.following_id = s.user_id AND f.status = 'accepted'
        )
      )
    ORDER BY s.created_at ASC
  `).all(req.userId, req.userId);

  // Group into one story tray item per author, with unviewed authors first.
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.user_id)) groups.set(row.user_id, []);
    groups.get(row.user_id).push(serializeStory(row, req.userId));
  }

  const items = Array.from(groups.values())
    .map((stories) => ({
      user: stories[0].author,
      stories,
      hasUnviewed: stories.some((s) => !s.viewed),
      latestCreatedAt: stories[stories.length - 1].createdAt,
    }))
    .sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed) || b.latestCreatedAt.localeCompare(a.latestCreatedAt));

    res.json({ stories: items });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, storyUpload.single('media'), async (req, res, next) => {
  try {
    const caption = String(req.body.caption || '').trim().slice(0, 280);
    if (!req.file && !caption) {
      return res.status(400).json({ error: 'Add a photo, video, or text to your status.' });
    }

    let asset = null;
    let resourceType = null;
    if (req.file) {
      resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      asset = await uploadBuffer(req.file.buffer, {
        folder: 'emberly/stories',
        resourceType,
      });
    }

    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO stories (id, user_id, media_url, public_id, resource_type, caption, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))
      `).run(id, req.userId, asset?.secure_url || null, asset?.public_id || null, resourceType, caption);
    } catch (databaseError) {
      if (asset?.public_id) {
        await deleteAsset(asset.public_id, resourceType || 'image').catch(() => {});
      }
      throw databaseError;
    }

    const row = db.prepare(`
      SELECT s.*, u.username, u.full_name, u.avatar_color, u.avatar_url
      FROM stories s JOIN users u ON u.id = s.user_id WHERE s.id = ?
    `).get(id);

    res.status(201).json({ story: serializeStory(row, req.userId) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/view', requireAuth, async (req, res, next) => {
  try {
    await purgeExpired();
  const story = db.prepare('SELECT * FROM stories WHERE id = ? AND expires_at > datetime("now")').get(req.params.id);
  if (!story || !canViewStory(story, req.userId)) return res.status(404).json({ error: 'Story not found or expired.' });

  db.prepare(`
    INSERT INTO story_views (id, story_id, user_id)
    VALUES (?, ?, ?)
    ON CONFLICT(story_id, user_id) DO UPDATE SET viewed_at = datetime('now')
  `).run(uuidv4(), story.id, req.userId);

    res.json({ viewed: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found.' });
    if (story.user_id !== req.userId) return res.status(403).json({ error: 'You can only delete your own story.' });

    if (story.public_id) {
      try {
        await deleteAsset(story.public_id, story.resource_type || 'image');
      } catch (error) {
        console.error(`Could not delete story asset ${story.id}:`, error);
        return res.status(502).json({ error: 'Story media could not be removed. Please try again.' });
      }
    }
    db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
