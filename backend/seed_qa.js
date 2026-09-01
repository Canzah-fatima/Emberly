const { v4: uuid } = require('uuid');
const db = require('./db');
const fs = require('fs');

const images = JSON.parse(fs.readFileSync('/home/claude/placeholder_images.json', 'utf8'));

const users = db.prepare('SELECT id, username FROM users').all();
const byName = Object.fromEntries(users.map(u => [u.username, u.id]));
const [amina, davidr, nora, jonah] = ['amina_k', 'davidr', 'nora_p', 'jonah_w'].map(n => byName[n]);

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const DIMS = { portrait: [720, 960], square: [800, 800], landscape: [1000, 600] };
function dimsFor(url) {
  if (images.portrait.includes(url)) return DIMS.portrait;
  if (images.square.includes(url)) return DIMS.square;
  if (images.landscape.includes(url)) return DIMS.landscape;
  return [1000, 1000];
}

function makePost(userId, mediaList, caption, hoursAgo = 0) {
  const postId = uuid();
  const createdAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('INSERT INTO posts (id, user_id, image_url, caption, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(postId, userId, mediaList[0], caption, createdAt);
  mediaList.forEach((url, i) => {
    const [w, h] = dimsFor(url);
    db.prepare('INSERT INTO post_media (id, post_id, url, resource_type, width, height, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(uuid(), postId, url, 'image', w, h, i, createdAt);
  });
  // hashtags
  const tags = caption.match(/#(\w+)/g) || [];
  for (const t of tags) {
    const name = t.slice(1).toLowerCase();
    let row = db.prepare('SELECT id FROM hashtags WHERE name = ?').get(name);
    let hid = row ? row.id : uuid();
    if (!row) db.prepare('INSERT INTO hashtags (id, name) VALUES (?, ?)').run(hid, name);
    db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)').run(postId, hid);
  }
  return postId;
}

// Follows (accepted)
function follow(a, b) {
  try { db.prepare('INSERT OR IGNORE INTO follows (id, follower_id, following_id, status) VALUES (?, ?, ?, ?)').run(uuid(), a, b, 'accepted'); } catch (e) {}
}
[[amina, davidr], [amina, nora], [davidr, amina], [nora, amina], [jonah, amina], [amina, jonah], [davidr, nora], [nora, davidr]].forEach(([a,b]) => follow(a,b));

// Posts: single, double, triple, 5-image, 10-image, various aspect ratios
const p1 = makePost(amina, [images.landscape[0]], 'Golden hour at the lake #sunset #travel', 2);
const p2 = makePost(davidr, [images.portrait[0], images.portrait[1]], 'City wandering with @amina_k this weekend', 5);
const p3 = makePost(nora, [images.square[0], images.landscape[1], images.portrait[2]], 'Studio day — three takes on the same light #photography', 8);
const p4 = makePost(amina, [images.landscape[2], images.square[1], images.portrait[3], images.square[2], images.landscape[3]], 'Five frames from the coast road trip #roadtrip #coast #vanlife', 20);
const p5 = makePost(davidr, images.portrait.slice(0, 10), 'Every single shot from today, no edits, ten of them #film #analog', 30);
const p6 = makePost(nora, [images.portrait[5]], 'Quiet morning ☕', 1);
const p7 = makePost(jonah, [images.square[3], images.square[4]], 'New gear day #photography #gear', 50);

// Likes
function like(userId, postId) { try { db.prepare('INSERT OR IGNORE INTO likes (id, post_id, user_id) VALUES (?, ?, ?)').run(uuid(), postId, userId); } catch(e){} }
[davidr, nora, jonah].forEach(u => like(u, p1));
[amina, jonah].forEach(u => like(u, p2));
[amina].forEach(u => like(u, p4));

// Comments (with reply threading + mention)
function comment(postId, userId, text, parentId = null) {
  const id = uuid();
  db.prepare('INSERT INTO comments (id, post_id, user_id, text, parent_id) VALUES (?, ?, ?, ?, ?)').run(id, postId, userId, text, parentId);
  return id;
}
const c1 = comment(p1, davidr, 'This light is unreal 😍');
comment(p1, amina, 'Thank you @davidr!! Golden hour never misses', c1);
comment(p1, nora, 'Need this location asap');
comment(p4, jonah, 'The coast road trip content we needed');

// Saves
db.prepare('INSERT OR IGNORE INTO saves (id, post_id, user_id) VALUES (?, ?, ?)').run(uuid(), p3, amina);
db.prepare('INSERT OR IGNORE INTO saves (id, post_id, user_id) VALUES (?, ?, ?)').run(uuid(), p5, amina);

// Notifications
function notif(recipient, actor, type, postId = null, hoursAgo = 0) {
  const createdAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('INSERT INTO notifications (id, recipient_id, actor_id, type, post_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), recipient, actor, type, postId, createdAt);
}
notif(amina, davidr, 'like', p1, 1);
notif(amina, nora, 'comment', p1, 2);
notif(amina, jonah, 'follow', null, 3);
notif(amina, davidr, 'mention', p2, 5);

// Story
db.prepare('INSERT INTO stories (id, user_id, media_url, resource_type, caption, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
  .run(uuid(), davidr, images.portrait[6], 'image', 'On set today', new Date(Date.now() + 20*3600*1000).toISOString());
db.prepare('INSERT INTO stories (id, user_id, media_url, resource_type, caption, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
  .run(uuid(), nora, images.portrait[7], 'image', '', new Date(Date.now() + 20*3600*1000).toISOString());

// Conversation + messages between amina and davidr
const convId = uuid();
db.prepare('INSERT INTO conversations (id) VALUES (?)').run(convId);
db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convId, amina);
db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)').run(convId, davidr);
function msg(sender, body, minsAgo, sharedPostId = null) {
  const createdAt = new Date(Date.now() - minsAgo*60*1000).toISOString().replace('T',' ').slice(0,19);
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, body, shared_post_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuid(), convId, sender, body, sharedPostId, createdAt);
}
msg(davidr, 'Hey! Loved the lake shot', 60);
msg(amina, 'Thank you!! Took like 30 tries to get the reflection right', 55);
msg(davidr, 'Worth it though. This is a much longer message just to check how the bubble handles wrapping across multiple lines when someone writes a lot of text in a single message without stopping to breathe, basically a paragraph.', 50);
msg(amina, 'Haha exactly', 2);

console.log('Seed complete.');
console.log(JSON.stringify({ amina, davidr, nora, jonah, p1, p2, p3, p4, p5, p6, p7 }, null, 2));
