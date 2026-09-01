const { v4: uuidv4 } = require('uuid');
const db = require('../db');

function notify({ recipientId, actorId, type, postId = null }) {
  if (recipientId === actorId) return; // never notify yourself
  db.prepare(`
    INSERT INTO notifications (id, recipient_id, actor_id, type, post_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), recipientId, actorId, type, postId);
}

module.exports = { notify };
