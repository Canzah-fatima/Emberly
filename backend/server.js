const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const storyRoutes = require('./routes/stories');
const messageRoutes = require('./routes/messages');
const db = require('./db');
const { deleteAsset } = require('./lib/cloudinary');
const realtime = require('./lib/realtime');

const app = express();

const PORT = Number(process.env.PORT) || 5050;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error(
    'JWT_SECRET must be set to a random value of at least 32 characters in production.'
  );
}

if (isProduction && !allowedOrigins.length) {
  throw new Error(
    'FRONTEND_ORIGIN must contain at least one allowed frontend origin in production.'
  );
}

/*
 * Lightweight in-memory rate limiter.
 * This is intentionally dependency-free.
 */
const rateBuckets = new Map();

const rateBucketCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000);
rateBucketCleanup.unref?.();

function rateLimit({ windowMs = 60_000, max = 180 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };

      rateBuckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      return res.status(429).json({
        error: 'Too many requests. Please try again shortly.',
        requestId: req.requestId,
      });
    }

    next();
  };
}

/*
 * Basic process hardening.
 */
app.disable('x-powered-by');
app.set('trust proxy', 1);

/*
 * Baseline security headers. Keep this dependency-free so the API remains
 * easy to deploy behind a reverse proxy.
 */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/*
 * Request ID is assigned before CORS so rejected-origin responses can still
 * be correlated with server logs.
 */
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

/*
 * CORS
 */
app.use(
  cors({
    origin: (origin, callback) => {
      /*
       * Allow requests with no Origin header.
       * This includes tools such as curl and server-to-server requests.
       */
      if (!origin) {
        return callback(null, true);
      }

      /*
       * During development, if FRONTEND_ORIGIN isn't configured,
       * allow the local frontend.
       */
      if (!allowedOrigins.length && !isProduction) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by Emberly.');
      error.status = 403;
      return callback(error);
    },
    credentials: false,
  })
);

/*
 * API protection.
 */
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 180,
  })
);

/*
 * JSON requests.
 */
app.use(
  express.json({
    limit: '1mb',
  })
);

/*
 * URL-encoded requests.
 */
app.use(
  express.urlencoded({
    extended: false,
    limit: '64kb',
  })
);

/*
 * IMPORTANT:
 *
 * There is deliberately NO:
 *
 * app.use('/uploads', express.static(...))
 *
 * User media must never be stored in backend/uploads.
 *
 * Images are handled by multer.memoryStorage()
 * inside the relevant routes and uploaded directly
 * to Cloudinary.
 */

/*
 * API routes.
 * Authentication gets a tighter limiter to slow credential stuffing without
 * penalizing normal feed/message activity.
 */
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messageRoutes);

async function cleanupExpiredStories() {
  const expired = db.prepare(`
    SELECT id, public_id, resource_type
    FROM stories
    WHERE expires_at <= datetime('now')
  `).all();

  if (!expired.length) return;

  for (const story of expired) {
    if (story.public_id) {
      try {
        await deleteAsset(story.public_id, story.resource_type || 'image');
      } catch (error) {
        console.error(`Could not delete expired story asset ${story.id}:`, error);
        continue;
      }
    }

    db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  }
}

cleanupExpiredStories().catch((error) => {
  console.error('Expired story cleanup failed:', error);
});

const storyCleanupInterval = setInterval(() => {
  cleanupExpiredStories().catch((error) => {
    console.error('Expired story cleanup failed:', error);
  });
}, 30 * 60 * 1000);
storyCleanupInterval.unref?.();

/*
 * Health check.
 */
app.get('/api/health', (req, res) => {
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    status: 'ok',
    name: 'Emberly API',
    requestId: req.requestId,
    storage: {
      provider: 'cloudinary',
      configured: cloudinaryConfigured,
    },
  });
});

/*
 * Readiness check.
 *
 * Cloudinary is required for media uploads.
 */
app.get('/api/ready', (req, res) => {
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  let database = false;

  try {
    database = db.prepare('SELECT 1 AS ok').get()?.ok === 1;
  } catch (error) {
    console.error(`[${req.requestId}] Readiness database probe failed:`, error);
  }

  const ready = database && cloudinaryConfigured;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    requestId: req.requestId,
    services: {
      database,
      cloudinary: cloudinaryConfigured,
    },
  });
});

/*
 * Unknown API route.
 */
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found.',
    requestId: req.requestId,
  });
});

/*
 * Global error handler.
 */
app.use((err, req, res, next) => {
  console.error(`[${req.requestId || 'no-request-id'}]`, err);

  if (err instanceof multer.MulterError) {
    let message = 'File upload failed.';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'One of the files exceeds the allowed size.';
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files were submitted.';
    }

    return res.status(400).json({
      error: message,
      requestId: req.requestId,
    });
  }

  const status = err.status || 500;

  const message =
    status >= 500 && isProduction
      ? 'Something went wrong. Please try again.'
      : err.message || 'Something went wrong.';

  res.status(status).json({
    error: message,
    requestId: req.requestId,
  });
});

/*
 * Start server.
 */
const serverInstance = app.listen(PORT, () => {
  realtime.attach(serverInstance);
  console.log(`Emberly API running on http://localhost:${PORT}`);
  console.log(`Emberly realtime messaging available on ws://localhost:${PORT}/ws`);
});

/*
 * Graceful shutdown.
 */
function shutdown(signal) {
  console.log(`${signal}: shutting down Emberly API...`);

  serverInstance.close(() => {
    clearInterval(storyCleanupInterval);
    clearInterval(rateBucketCleanup);
    try {
      require('./db').close();
    } catch (_) {
      // Database may already be closed.
    }

    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));