const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function serialize(n) {
  const actor = db.prepare('SELECT * FROM users WHERE id = ?').get(n.actor_id);
  let post = null;
  if (n.post_id) {
    const p = db.prepare(`SELECT p.id, p.image_url, (SELECT pm.url FROM post_media pm WHERE pm.post_id = p.id ORDER BY pm.position ASC LIMIT 1) AS media_url FROM posts p WHERE p.id = ?`).get(n.post_id);
    if (p) post = { id: p.id, imageUrl: p.media_url || p.image_url || null };
  }
  return {
    id: n.id,
    type: n.type,
    read: !!n.read,
    createdAt: n.created_at,
    post,
    actor: {
      username: actor.username,
      fullName: actor.full_name,
      avatarColor: actor.avatar_color,
      avatarUrl: actor.avatar_url,
    },
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.userId);
  res.json({ notifications: rows.map(serialize) });
});

router.get('/unread-count', requireAuth, (req, res) => {
  const row = db.prepare(`SELECT COUNT(*) c FROM notifications WHERE recipient_id = ? AND read = 0`).get(req.userId);
  res.json({ count: row.c });
});

router.post('/read-all', requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE recipient_id = ?`).run(req.userId);
  res.json({ success: true });
});

module.exports = router;
