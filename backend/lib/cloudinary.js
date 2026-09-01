const crypto = require('crypto');

function isConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function ensureConfig() {
  const config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };

  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    const error = new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
    error.status = 503;
    throw error;
  }

  return config;
}

function signature(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(payload + apiSecret).digest('hex');
}

async function parseCloudinaryResponse(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Upstream (Cloudinary, or a proxy/CDN in front of it) returned a
    // non-JSON body (HTML error page, plain-text block message, etc).
    // Surface a clean error instead of throwing an unhandled SyntaxError.
    const error = new Error(
      raw?.slice(0, 200) || 'Cloudinary returned an unexpected response.'
    );
    error.status = 502;
    throw error;
  }
}

async function uploadBuffer(buffer, { folder = 'emberly/posts', resourceType = 'image' } = {}) {
  const { cloudName, apiKey, apiSecret } = ensureConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const form = new FormData();

  form.append('file', new Blob([buffer]));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature(params, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: 'POST',
    body: form,
  });

  const result = await parseCloudinaryResponse(response);
  if (!response.ok) {
    const error = new Error(result?.error?.message || 'Cloudinary upload failed.');
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  return result;
}

async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  const { cloudName, apiKey, apiSecret } = ensureConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const form = new URLSearchParams();
  form.set('public_id', publicId);
  form.set('api_key', apiKey);
  form.set('timestamp', String(timestamp));
  form.set('signature', signature(params, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  // deleteAsset is always called in a best-effort/cleanup context (post
  // delete, orphaned-upload rollback) and its callers already swallow
  // rejections with .catch(() => {}), so we only need to avoid throwing
  // on a malformed body here — never block on the parse.
  await parseCloudinaryResponse(response).catch(() => {});
}

module.exports = { uploadBuffer, deleteAsset, isConfigured };
