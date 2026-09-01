const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const db = require('../db');
const {
  requireAuth,
  optionalAuth,
} = require('../middleware/auth');

const { notify } = require('../lib/notify');
const {
  uploadBuffer,
  deleteAsset,
} = require('../lib/cloudinary');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Upload configuration
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Files are kept in memory only.
| Nothing is written to backend/uploads or any project directory.
|
| Maximum:
| - 10 photos or videos per post
| - 100 MB per media file
|
*/

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 10, fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp|avif)$/i.test(file.mimetype) ||
        /^video\/(mp4|webm|quicktime)$/i.test(file.mimetype)) {
      return cb(null, true);
    }
    const error = new Error('Supported post media: JPG, PNG, GIF, WEBP, AVIF, MP4, MOV or WebM.');
    error.status = 400;
    cb(error);
  },
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getPostMedia(postId) {
  return db
    .prepare(`
      SELECT
        id,
        url,
        public_id,
        resource_type,
        width,
        height,
        format,
        position
      FROM post_media
      WHERE post_id = ?
      ORDER BY position ASC
    `)
    .all(postId)
    .map((media) => ({
      id: media.id,
      url: media.url,
      publicId: media.public_id,
      resourceType: media.resource_type,
      width: media.width,
      height: media.height,
      format: media.format,
      position: media.position,
    }));
}

function canViewPost(post, viewerId) {
  if (!post?.user_id) return false;
  if (post.user_id === viewerId) return true;

  const owner = db
    .prepare('SELECT is_private FROM users WHERE id = ?')
    .get(post.user_id);

  if (!owner) return false;
  if (!owner.is_private) return true;
  if (!viewerId) return false;

  return !!db
    .prepare(`
      SELECT 1
      FROM follows
      WHERE follower_id = ?
        AND following_id = ?
        AND status = 'accepted'
    `)
    .get(viewerId, post.user_id);
}

function extractHashtags(text) {
  return [...new Set((String(text || '').match(/#[a-zA-Z0-9_]+/g) || []).map((tag) => tag.slice(1).toLowerCase()).filter(Boolean))].slice(0, 30);
}

function extractMentions(text) {
  return [...new Set((String(text || '').match(/@[a-zA-Z0-9_.]+/g) || []).map((tag) => tag.slice(1).toLowerCase()).filter(Boolean))].slice(0, 30);
}

function getPostHashtags(postId) {
  return db.prepare(`SELECT h.name FROM post_hashtags ph JOIN hashtags h ON h.id = ph.hashtag_id WHERE ph.post_id = ? ORDER BY h.name ASC`).all(postId).map((row) => row.name);
}

function getPostMentions(postId) {
  return db.prepare(`SELECT u.id, u.username FROM post_mentions pm JOIN users u ON u.id = pm.user_id WHERE pm.post_id = ? ORDER BY u.username ASC`).all(postId);
}

function serializePost(post, userId) {
  const likeCount =
    db
      .prepare(
        'SELECT COUNT(*) AS c FROM likes WHERE post_id = ?'
      )
      .get(post.id).c;

  const commentCount =
    db
      .prepare(
        'SELECT COUNT(*) AS c FROM comments WHERE post_id = ?'
      )
      .get(post.id).c;

  const liked = userId
    ? !!db
        .prepare(
          `
          SELECT id
          FROM likes
          WHERE post_id = ?
            AND user_id = ?
          `
        )
        .get(post.id, userId)
    : false;

  const saved = userId
    ? !!db
        .prepare(
          `
          SELECT id
          FROM saves
          WHERE post_id = ?
            AND user_id = ?
          `
        )
        .get(post.id, userId)
    : false;

  const author = db
    .prepare(
      `
      SELECT
        id,
        username,
        full_name,
        avatar_color,
        avatar_url
      FROM users
      WHERE id = ?
      `
    )
    .get(post.user_id);

  const media = getPostMedia(post.id);

  const fallbackImage =
    media[0]?.url ||
    post.image_url ||
    null;

  let likeSampleUser = null;

  if (likeCount > 0) {
    const excludeId = userId || '';

    const sample = db
      .prepare(
        `
        SELECT u.username
        FROM likes l
        JOIN users u
          ON u.id = l.user_id
        WHERE l.post_id = ?
          AND l.user_id != ?
        ORDER BY l.created_at DESC
        LIMIT 1
        `
      )
      .get(post.id, excludeId);

    likeSampleUser =
      sample?.username || null;
  }


  return {
    id: post.id,

    imageUrl:
      fallbackImage,

    media,

    caption:
      post.caption || '',

    createdAt:
      post.created_at,

    likeCount,

    commentCount,


    hashtags: getPostHashtags(post.id),
    mentions: getPostMentions(post.id),

    liked,

    saved,

    viewerLiked:
      liked,

    likeSampleUser,

    author: {
      id: author?.id || post.user_id,

      username:
        author?.username || 'user',

      fullName:
        author?.full_name || '',

      avatarColor:
        author?.avatar_color || '#37415C',

      avatarUrl:
        author?.avatar_url || null,
    },
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
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Feed
|--------------------------------------------------------------------------
*/

router.get(
  '/feed',
  requireAuth,
  (req, res) => {
    const following = db
      .prepare(
        `
        SELECT following_id
        FROM follows
        WHERE follower_id = ?
          AND status = 'accepted'
        `
      )
      .all(req.userId)
      .map(
        (row) =>
          row.following_id
      );

    const ids = [
      ...new Set([
        ...following,
        req.userId,
      ]),
    ];

    if (!ids.length) {
      return res.json({
        posts: [],
      });
    }

    const placeholders =
      ids
        .map(() => '?')
        .join(',');

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const before = decodeCursor(req.query.before);
    const cursorClause = before ? 'AND (created_at < ? OR (created_at = ? AND id < ?))' : '';
    const params = before ? [...ids, before.createdAt, before.createdAt, before.id, limit + 1] : [...ids, limit + 1];

    const posts = db
      .prepare(
        `
        SELECT *
        FROM posts
        WHERE user_id IN (${placeholders})
          ${cursorClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        `
      )
      .all(...params);

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    return res.json({
      posts: page.map((post) => serializePost(post, req.userId)),
      hasMore,
      nextBefore: hasMore ? encodeCursor(page[page.length - 1]) : null,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Explore
|--------------------------------------------------------------------------
*/

router.get(
  '/explore',
  optionalAuth,
  (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 60);
    const before = decodeCursor(req.query.before);
    let posts;

    if (req.userId) {
      posts = db
        .prepare(
          `
          SELECT p.*
          FROM posts p
          JOIN users u
            ON u.id = p.user_id
          WHERE
            u.is_private = 0
            OR u.id = ?
            OR EXISTS (
              SELECT 1
              FROM follows f
              WHERE f.follower_id = ?
                AND f.following_id = u.id
                AND f.status = 'accepted'
            )
          ${before ? 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))' : ''}
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT ?
          `
        )
        .all(
          req.userId,
          req.userId,
          ...(before ? [before.createdAt, before.createdAt, before.id] : []),
          limit + 1
        );
    } else {
      posts = db
        .prepare(
          `
          SELECT p.*
          FROM posts p
          JOIN users u
            ON u.id = p.user_id
          WHERE u.is_private = 0
          ${before ? 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))' : ''}
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT ?
          `
        )
        .all(
          ...(before ? [before.createdAt, before.createdAt, before.id] : []),
          limit + 1
        );
    }

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    return res.json({
      posts: page.map((post) => serializePost(post, req.userId)),
      hasMore,
      nextBefore: hasMore ? encodeCursor(page[page.length - 1]) : null,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Saved posts
|--------------------------------------------------------------------------
*/

router.get(
  '/saved',
  requireAuth,
  (req, res) => {
    const posts = db
      .prepare(
        `
        SELECT p.*
        FROM saves s
        JOIN posts p
          ON p.id = s.post_id
        WHERE s.user_id = ?
        ORDER BY s.created_at DESC
        `
      )
      .all(req.userId);

    return res.json({
      posts: posts.map((post) =>
        serializePost(
          post,
          req.userId
        )
      ),
    });
  }
);

/*
|--------------------------------------------------------------------------
| Single post
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  optionalAuth,
  (req, res) => {
    const post = db
      .prepare(
        'SELECT * FROM posts WHERE id = ?'
      )
      .get(req.params.id);

    if (!post || !canViewPost(post, req.userId)) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    return res.json({
      post: serializePost(
        post,
        req.userId
      ),
    });
  }
);

/*
|--------------------------------------------------------------------------
| CREATE POST
|--------------------------------------------------------------------------
|
| Frontend:
|
| FormData:
|   images[]
|   caption
|
| Images:
|   Browser
|      ↓
|   Express / Multer memory
|      ↓
|   Cloudinary
|      ↓
|   permanent secure_url
|      ↓
|   SQLite database
|
| NO local filesystem storage.
|
*/

router.post(
  '/',
  requireAuth,
  upload.fields([
    {
      name: 'images',
      maxCount: 10,
    },
    {
      name: 'image',
      maxCount: 1,
    },
  ]),
  async (req, res, next) => {
    const uploaded = [];

    try {
      const files = [
        ...(req.files?.images || []),
        ...(req.files?.image || []),
      ];

      /*
       * Validate media count.
       */

      if (!files.length) {
        return res.status(400).json({
          error:
            'Choose at least one photo or video.',
        });
      }

      if (files.length > 10) {
        return res.status(400).json({
          error:
            'You can add up to 10 photos or videos per post.',
        });
      }

      /*
       * Validate again before cloud upload.
       */

      for (const file of files) {
        if (!file.buffer || !file.mimetype || !file.size) {
          return res.status(400).json({ error: 'One or more uploaded media files are invalid.' });
        }

        const isImage = /^image\/(jpeg|png|gif|webp|avif)$/i.test(file.mimetype);
        const isVideo = /^video\/(mp4|webm|quicktime)$/i.test(file.mimetype);

        if (!isImage && !isVideo) {
          return res.status(400).json({ error: 'Unsupported media format.' });
        }

        if (file.size > 100 * 1024 * 1024) {
          return res.status(400).json({ error: 'Each media file must be 100 MB or smaller.' });
        }
      }

      /*
       * Upload directly to Cloudinary.
       *
       * uploadBuffer() receives the in-memory
       * Buffer. The server never writes it
       * to disk.
       */

      for (const file of files) {
        const asset =
          await uploadBuffer(
            file.buffer,
            {
              folder: 'emberly/posts',
              resourceType: file.mimetype.startsWith('video/') ? 'video' : 'image',
            }
          );

        uploaded.push(asset);
      }

      /*
       * Caption.
       */

      const rawCaption = String(req.body.caption || '').trim();
      if (rawCaption.length > 2200) {
        return res.status(400).json({ error: 'Caption must be 2200 characters or fewer.' });
      }
      const caption = rawCaption.slice(0, 2200);

      /*
       * Create post + media rows
       * atomically.
       */

      const postId =
        uuidv4();

      const transaction =
        db.transaction(() => {
          db.prepare(
            `
            INSERT INTO posts (
              id,
              user_id,
              image_url,
              caption
            )
            VALUES (?, ?, ?, ?)
            `
          ).run(
            postId,
            req.userId,
            uploaded[0]?.secure_url ||
              null,
            caption
          );

          const insertMedia =
            db.prepare(
              `
              INSERT INTO post_media (
                id,
                post_id,
                url,
                public_id,
                resource_type,
                width,
                height,
                format,
                position
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `
            );

          uploaded.forEach(
            (asset, index) => {
              insertMedia.run(
                uuidv4(),
                postId,
                asset.secure_url,
                asset.public_id,
                asset.resource_type,
                asset.width || null,
                asset.height || null,
                asset.format || null,
                index
              );
            }
          );

          const hashtags = extractHashtags(caption);
          const mentions = extractMentions(caption);
          const insertHashtag = db.prepare('INSERT OR IGNORE INTO hashtags (id, name) VALUES (?, ?)');
          const findHashtag = db.prepare('SELECT id FROM hashtags WHERE name = ?');
          const insertPostHashtag = db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)');
          for (const name of hashtags) {
            insertHashtag.run(uuidv4(), name);
            const hashtag = findHashtag.get(name);
            if (hashtag) insertPostHashtag.run(postId, hashtag.id);
          }

          const findUser = db.prepare('SELECT id FROM users WHERE username = ?');
          const insertMention = db.prepare('INSERT OR IGNORE INTO post_mentions (post_id, user_id) VALUES (?, ?)');
          for (const username of mentions) {
            const mentioned = findUser.get(username);
            if (mentioned) insertMention.run(postId, mentioned.id);
          }
        });

      try {
        transaction();
      } catch (databaseError) {
        /*
         * Database failed after Cloudinary
         * upload — remove orphaned assets.
         */

        await Promise.all(
          uploaded.map(
            (asset) =>
              deleteAsset(
                asset.public_id,
                asset.resource_type
              ).catch(
                () => {}
              )
          )
        );

        uploaded.length = 0;
        throw databaseError;
      }

      /*
       * Return the fully serialized
       * persisted post.
       */

      const post =
        db
          .prepare(
            'SELECT * FROM posts WHERE id = ?'
          )
          .get(postId);

      const mentionedUsers = db.prepare(`SELECT user_id FROM post_mentions WHERE post_id = ?`).all(postId);
      mentionedUsers.forEach(({ user_id }) => notify({ recipientId: user_id, actorId: req.userId, type: 'mention', postId }));

      return res.status(201).json({
        post: serializePost(
          post,
          req.userId
        ),
      });
    } catch (error) {
      /*
       * Any failure before database
       * persistence should clean up
       * Cloudinary assets.
       */

      if (uploaded.length) {
        await Promise.all(
          uploaded.map(
            (asset) =>
              deleteAsset(
                asset.public_id,
                asset.resource_type
              ).catch(
                () => {}
              )
          )
        );
      }

      return next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Hashtag discovery
|--------------------------------------------------------------------------
*/
router.get('/tag/:tag', optionalAuth, (req, res) => {
  const tag = String(req.params.tag || '').replace(/^#/, '').trim().toLowerCase();
  if (!/^[a-z0-9_]{1,80}$/.test(tag)) return res.status(400).json({ error: 'Invalid hashtag.' });
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 60);
  const before = decodeCursor(req.query.before);
  const cursorClause = before ? 'AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))' : '';
  const params = [tag, req.userId || '', req.userId || ''];
  if (before) params.push(before.createdAt, before.createdAt, before.id);
  params.push(limit + 1);
  const posts = db.prepare(`
    SELECT p.* FROM posts p
    JOIN post_hashtags ph ON ph.post_id = p.id
    JOIN hashtags h ON h.id = ph.hashtag_id
    JOIN users u ON u.id = p.user_id
    WHERE h.name = ? AND (u.is_private = 0 OR u.id = ? OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.following_id = u.id AND f.status = 'accepted'))
      ${cursorClause}
    ORDER BY p.created_at DESC, p.id DESC LIMIT ?
  `).all(...params);
  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  return res.json({ tag, posts: page.map((post) => serializePost(post, req.userId)), hasMore, nextBefore: hasMore ? encodeCursor(page[page.length - 1]) : null });
});

/*
|--------------------------------------------------------------------------
| Edit post caption
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id',
  requireAuth,
  (req, res, next) => {
    try {
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      if (post.user_id !== req.userId) return res.status(403).json({ error: 'You can only edit your own post.' });

      const rawCaption = String(req.body.caption || '').trim();
      if (rawCaption.length > 2200) return res.status(400).json({ error: 'Caption must be 2200 characters or fewer.' });
      const caption = rawCaption;
      const hashtags = extractHashtags(caption);
      const mentions = extractMentions(caption);

      const transaction = db.transaction(() => {
        db.prepare('UPDATE posts SET caption = ? WHERE id = ?').run(caption, post.id);
        db.prepare('DELETE FROM post_hashtags WHERE post_id = ?').run(post.id);
        db.prepare('DELETE FROM post_mentions WHERE post_id = ?').run(post.id);

        const findHashtag = db.prepare('SELECT id FROM hashtags WHERE name = ?');
        const createHashtag = db.prepare('INSERT INTO hashtags (id, name) VALUES (?, ?)');
        const linkHashtag = db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)');
        for (const name of hashtags) {
          let row = findHashtag.get(name);
          if (!row) { createHashtag.run(uuidv4(), name); row = findHashtag.get(name); }
          linkHashtag.run(post.id, row.id);
        }

        const findUser = db.prepare('SELECT id FROM users WHERE username = ?');
        const linkMention = db.prepare('INSERT OR IGNORE INTO post_mentions (post_id, user_id) VALUES (?, ?)');
        for (const username of mentions) {
          const mentioned = findUser.get(username);
          if (mentioned) linkMention.run(post.id, mentioned.id);
        }
      });
      transaction();

      const mentionedNames = extractMentions(caption);
      const findMentioned = db.prepare('SELECT id FROM users WHERE username = ?');
      for (const username of mentionedNames) {
        const mentioned = findMentioned.get(username);
        if (mentioned && mentioned.id !== req.userId) notify({ recipientId: mentioned.id, actorId: req.userId, type: 'mention', postId: post.id });
      }

      return res.json({ post: serializePost({ ...post, caption }, req.userId) });
    } catch (error) {
      return next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete post
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const post =
        db
          .prepare(
            'SELECT * FROM posts WHERE id = ?'
          )
          .get(req.params.id);

      if (!post) {
        return res.status(404).json({
          error: 'Post not found.',
        });
      }

      if (
        post.user_id !==
        req.userId
      ) {
        return res.status(403).json({
          error:
            'You can only delete your own posts.',
        });
      }

      const media =
        db
          .prepare(
            `
            SELECT
              public_id,
              resource_type
            FROM post_media
            WHERE post_id = ?
            `
          )
          .all(req.params.id);

      db.prepare(
        'DELETE FROM posts WHERE id = ?'
      ).run(req.params.id);

      /*
       * Remove corresponding
       * Cloudinary assets.
       */

      await Promise.all(
        media
          .filter(
            (item) =>
              item.public_id
          )
          .map((item) =>
            deleteAsset(
              item.public_id,
              item.resource_type
            ).catch(
              () => {}
            )
          )
      );

      return res.json({
        success: true,
      });
    } catch (error) {
      return next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Like post
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/like',
  requireAuth,
  (req, res) => {
    const post =
      db
        .prepare(
          'SELECT * FROM posts WHERE id = ?'
        )
        .get(req.params.id);

    if (!post || !canViewPost(post, req.userId)) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    const existing =
      db
        .prepare(
          `
          SELECT id
          FROM likes
          WHERE post_id = ?
            AND user_id = ?
          `
        )
        .get(
          req.params.id,
          req.userId
        );

    if (existing) {
      db.prepare(
        'DELETE FROM likes WHERE id = ?'
      ).run(existing.id);
    } else {
      db.prepare(
        `
        INSERT INTO likes (
          id,
          post_id,
          user_id
        )
        VALUES (?, ?, ?)
        `
      ).run(
        uuidv4(),
        req.params.id,
        req.userId
      );

      notify({
        recipientId:
          post.user_id,

        actorId:
          req.userId,

        type: 'like',

        postId:
          post.id,
      });
    }

    const likeCount =
      db
        .prepare(
          `
          SELECT COUNT(*) AS c
          FROM likes
          WHERE post_id = ?
          `
        )
        .get(req.params.id).c;

    return res.json({
      liked: !existing,
      likeCount,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Save post
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/save',
  requireAuth,
  (req, res) => {
    const post =
      db
        .prepare(
          'SELECT * FROM posts WHERE id = ?'
        )
        .get(req.params.id);

    if (!post || !canViewPost(post, req.userId)) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    const existing =
      db
        .prepare(
          `
          SELECT id
          FROM saves
          WHERE post_id = ?
            AND user_id = ?
          `
        )
        .get(
          req.params.id,
          req.userId
        );

    if (existing) {
      db.prepare(
        'DELETE FROM saves WHERE id = ?'
      ).run(existing.id);

      return res.json({
        saved: false,
      });
    }

    db.prepare(
      `
      INSERT INTO saves (
        id,
        post_id,
        user_id
      )
      VALUES (?, ?, ?)
      `
    ).run(
      uuidv4(),
      req.params.id,
      req.userId
    );

    return res.json({
      saved: true,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Comments
|--------------------------------------------------------------------------
*/

function serializeComment(
  comment,
  userId
) {
  const likeCount =
    db
      .prepare(
        `
        SELECT COUNT(*) AS c
        FROM comment_likes
        WHERE comment_id = ?
        `
      )
      .get(comment.id).c;

  const liked = userId
    ? !!db
        .prepare(
          `
          SELECT id
          FROM comment_likes
          WHERE comment_id = ?
            AND user_id = ?
          `
        )
        .get(
          comment.id,
          userId
        )
    : false;

  return {
    id: comment.id,

    text:
      comment.text,

    parentId:
      comment.parent_id ||
      null,

    editedAt:
      comment.edited_at ||
      null,

    createdAt:
      comment.created_at,

    likeCount,

    liked,

    author: {
      id:
        comment.user_id,

      username:
        comment.username,

      fullName:
        comment.full_name,

      avatarColor:
        comment.avatar_color,

      avatarUrl:
        comment.avatar_url,
    },
  };
}

function commentQuery(postId) {
  return db
    .prepare(
      `
      SELECT
        c.*,
        u.username,
        u.full_name,
        u.avatar_color,
        u.avatar_url
      FROM comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
      `
    )
    .all(postId);
}

/*
|--------------------------------------------------------------------------
| Get comments
|--------------------------------------------------------------------------
*/

router.get(
  '/:id/comments',
  optionalAuth,
  (req, res) => {
    const post =
      db
        .prepare(
          'SELECT id, user_id FROM posts WHERE id = ?'
        )
        .get(req.params.id);

    if (!post || !canViewPost(post, req.userId)) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    const comments =
      commentQuery(
        req.params.id
      ).map((comment) =>
        serializeComment(
          comment,
          req.userId
        )
      );

    return res.json({
      comments,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Create comment / reply
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/comments',
  requireAuth,
  (req, res) => {
    const text =
      String(
        req.body.text || ''
      )
        .trim();

    const parentId =
      req.body.parentId
        ? String(
            req.body.parentId
          )
        : null;

    if (!text) {
      return res.status(400).json({
        error:
          'Comment cannot be empty.',
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        error:
          'Comment is too long.',
      });
    }

    const post =
      db
        .prepare(
          `
          SELECT id, user_id
          FROM posts
          WHERE id = ?
          `
        )
        .get(req.params.id);

    if (!post || !canViewPost(post, req.userId)) {
      return res.status(404).json({
        error: 'Post not found.',
      });
    }

    if (parentId) {
      const parent =
        db
          .prepare(
            `
            SELECT id, post_id
            FROM comments
            WHERE id = ?
            `
          )
          .get(parentId);

      if (
        !parent ||
        parent.post_id !==
          req.params.id
      ) {
        return res.status(400).json({
          error:
            'Invalid reply target.',
        });
      }
    }

    const id =
      uuidv4();

    db.prepare(
      `
      INSERT INTO comments (
        id, post_id, user_id, text, parent_id
      ) VALUES (?, ?, ?, ?, ?)
      `
    ).run(id, req.params.id, req.userId, text, parentId);

    const mentionedNames = extractMentions(text);
    const findMentioned = db.prepare('SELECT id FROM users WHERE username = ?');
    const insertCommentMention = db.prepare('INSERT OR IGNORE INTO comment_mentions (comment_id, user_id) VALUES (?, ?)');
    for (const username of mentionedNames) {
      const mentioned = findMentioned.get(username);
      if (mentioned) {
        insertCommentMention.run(id, mentioned.id);
        notify({ recipientId: mentioned.id, actorId: req.userId, type: 'mention', postId: post.id });
      }
    }

    const notificationRecipient = parentId
      ? db.prepare('SELECT user_id FROM comments WHERE id = ?').get(parentId)?.user_id || post.user_id
      : post.user_id;
    notify({
      recipientId: notificationRecipient,
      actorId: req.userId,
      type: parentId ? 'comment_reply' : 'comment',
      postId: post.id,
    });

    const comment =
      db
        .prepare(
          `
          SELECT
            c.*,
            u.username,
            u.full_name,
            u.avatar_color,
            u.avatar_url
          FROM comments c
          JOIN users u
            ON u.id = c.user_id
          WHERE c.id = ?
          `
        )
        .get(id);

    const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(post.id).c;

    return res.status(201).json({
      comment: serializeComment(comment, req.userId),
      commentCount,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Edit comment
|--------------------------------------------------------------------------
*/

router.patch(
  '/comments/:commentId',
  requireAuth,
  (req, res) => {
    const text =
      String(
        req.body.text || ''
      )
        .trim();

    if (!text) {
      return res.status(400).json({
        error:
          'Comment cannot be empty.',
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        error:
          'Comment is too long.',
      });
    }

    const comment =
      db
        .prepare(
          'SELECT * FROM comments WHERE id = ?'
        )
        .get(
          req.params.commentId
        );

    if (!comment) {
      return res.status(404).json({
        error:
          'Comment not found.',
      });
    }

    if (
      comment.user_id !==
      req.userId
    ) {
      return res.status(403).json({
        error:
          'You can only edit your own comments.',
      });
    }

    const oldMentionIds = new Set(
      db.prepare('SELECT user_id FROM comment_mentions WHERE comment_id = ?').all(req.params.commentId).map((row) => row.user_id)
    );
    const mentionedNames = extractMentions(text);
    const findMentioned = db.prepare('SELECT id FROM users WHERE username = ?');

    const updateComment = db.transaction(() => {
      db.prepare(
        `
        UPDATE comments
        SET
          text = ?,
          edited_at = datetime('now')
        WHERE id = ?
        `
      ).run(
        text,
        req.params.commentId
      );

      db.prepare('DELETE FROM comment_mentions WHERE comment_id = ?').run(req.params.commentId);
      const insertMention = db.prepare('INSERT OR IGNORE INTO comment_mentions (comment_id, user_id) VALUES (?, ?)');
      for (const username of mentionedNames) {
        const mentioned = findMentioned.get(username);
        if (mentioned) insertMention.run(req.params.commentId, mentioned.id);
      }
    });
    updateComment();

    for (const username of mentionedNames) {
      const mentioned = findMentioned.get(username);
      if (mentioned && mentioned.id !== req.userId && !oldMentionIds.has(mentioned.id)) {
        notify({ recipientId: mentioned.id, actorId: req.userId, type: 'mention', postId: comment.post_id });
      }
    }

    const updated =
      db
        .prepare(
          `
          SELECT
            c.*,
            u.username,
            u.full_name,
            u.avatar_color,
            u.avatar_url
          FROM comments c
          JOIN users u
            ON u.id = c.user_id
          WHERE c.id = ?
          `
        )
        .get(
          req.params.commentId
        );

    return res.json({
      comment:
        serializeComment(
          updated,
          req.userId
        ),
    });
  }
);

/*
|--------------------------------------------------------------------------
| Like comment
|--------------------------------------------------------------------------
*/

router.post(
  '/comments/:commentId/like',
  requireAuth,
  (req, res) => {
    const comment =
      db
        .prepare(
          `SELECT c.id, c.user_id, c.post_id, p.user_id AS post_user_id
           FROM comments c
           JOIN posts p ON p.id = c.post_id
           WHERE c.id = ?`
        )
        .get(
          req.params.commentId
        );

    if (!comment || !canViewPost({ user_id: comment.post_user_id }, req.userId)) {
      return res.status(404).json({
        error:
          'Comment not found.',
      });
    }

    const existing =
      db
        .prepare(
          `
          SELECT id
          FROM comment_likes
          WHERE comment_id = ?
            AND user_id = ?
          `
        )
        .get(
          req.params.commentId,
          req.userId
        );

    if (existing) {
      db.prepare(
        'DELETE FROM comment_likes WHERE id = ?'
      ).run(existing.id);
    } else {
      db.prepare(
        `
        INSERT INTO comment_likes (
          id,
          comment_id,
          user_id
        )
        VALUES (?, ?, ?)
        `
      ).run(
        uuidv4(),
        req.params.commentId,
        req.userId
      );

      notify({
        recipientId: comment.user_id,
        actorId: req.userId,
        type: 'comment_like',
        postId: comment.post_id,
      });
    }

    const likeCount =
      db
        .prepare(
          `
          SELECT COUNT(*) AS c
          FROM comment_likes
          WHERE comment_id = ?
          `
        )
        .get(
          req.params.commentId
        ).c;

    return res.json({
      liked: !existing,
      likeCount,
    });
  }
);

/*
|--------------------------------------------------------------------------
| Delete comment
|--------------------------------------------------------------------------
*/

router.delete(
  '/comments/:commentId',
  requireAuth,
  (req, res) => {
    const comment =
      db
        .prepare(
          'SELECT * FROM comments WHERE id = ?'
        )
        .get(
          req.params.commentId
        );

    if (!comment) {
      return res.status(404).json({
        error:
          'Comment not found.',
      });
    }

    if (
      comment.user_id !==
      req.userId
    ) {
      return res.status(403).json({
        error:
          'You can only delete your own comments.',
      });
    }

    db.prepare(
      'DELETE FROM comments WHERE id = ?'
    ).run(
      req.params.commentId
    );

    const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(comment.post_id).c;

    return res.json({
      success: true,
      commentCount,
    });
  }
);

module.exports = router;