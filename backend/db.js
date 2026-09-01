const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'emberly.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#37415C',
  avatar_url TEXT DEFAULT NULL,
  avatar_public_id TEXT DEFAULT NULL,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT DEFAULT NULL,
  caption TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT DEFAULT NULL,
  resource_type TEXT NOT NULL DEFAULT 'image',
  width INTEGER DEFAULT NULL,
  height INTEGER DEFAULT NULL,
  format TEXT DEFAULT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hashtags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id TEXT NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE TABLE IF NOT EXISTS post_mentions (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  edited_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comment_likes (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT DEFAULT NULL,
  public_id TEXT DEFAULT NULL,
  resource_type TEXT DEFAULT NULL,
  caption TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_views (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TEXT DEFAULT (datetime('now')),
  UNIQUE(story_id, user_id)
);


CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  shared_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  media_url TEXT DEFAULT NULL,
  media_public_id TEXT DEFAULT NULL,
  media_resource_type TEXT DEFAULT NULL,
  media_format TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  read_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_media_position ON post_media(post_id, position);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON post_hashtags(hashtag_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user ON post_mentions(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON comment_mentions(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(sender_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_shared_post ON messages(shared_post_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);


`);

// Lightweight schema migration for databases created before avatar cloud metadata existed.
try {
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userColumns.includes('avatar_public_id')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_public_id TEXT DEFAULT NULL');
  }
} catch (error) {
  console.error('Could not migrate avatar_public_id:', error);
}

// Lightweight comment schema migrations for existing databases.
try {
  const commentColumns = db.prepare('PRAGMA table_info(comments)').all().map((c) => c.name);
  if (!commentColumns.includes('parent_id')) db.exec('ALTER TABLE comments ADD COLUMN parent_id TEXT DEFAULT NULL');
  if (!commentColumns.includes('edited_at')) db.exec('ALTER TABLE comments ADD COLUMN edited_at TEXT DEFAULT NULL');
  db.exec(`CREATE TABLE IF NOT EXISTS comment_likes (
    id TEXT PRIMARY KEY,
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(comment_id, user_id)
  );`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id)');
} catch (error) {
  console.error('Could not migrate comment threading/likes:', error);
}

// Lightweight message-media migration for existing databases.
try {
  const messageColumns = db.prepare('PRAGMA table_info(messages)').all().map((c) => c.name);
  const additions = [
    ['media_url', 'TEXT DEFAULT NULL'],
    ['media_public_id', 'TEXT DEFAULT NULL'],
    ['media_resource_type', 'TEXT DEFAULT NULL'],
    ['media_format', 'TEXT DEFAULT NULL'],
  ];
  for (const [name, definition] of additions) {
    if (!messageColumns.includes(name)) db.exec(`ALTER TABLE messages ADD COLUMN ${name} ${definition}`);
  }
} catch (error) {
  console.error('Could not migrate message media fields:', error);
}

// Backfill the new media relation for legacy posts without touching their existing URLs.
// New uploads never use image_url as storage; it is retained only as a compatibility field.
const legacyPosts = db.prepare(`
  SELECT p.id, p.image_url FROM posts p
  WHERE p.image_url IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = p.id)
`).all();
const insertLegacy = db.prepare(`
  INSERT INTO post_media (id, post_id, url, position)
  VALUES (?, ?, ?, 0)
`);
for (const post of legacyPosts) {
  insertLegacy.run(`legacy_${post.id}`, post.id, post.image_url);
}

module.exports = db;
