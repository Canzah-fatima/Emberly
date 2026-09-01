const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const db = require('../db');

const clients = new Map();
const sockets = new Set();
const HEARTBEAT_MS = 30_000;
const AUTH_TIMEOUT_MS = 10_000;
const MAX_FRAME_BYTES = 8 * 1024 * 1024;

function acceptKey(key) {
  return crypto.createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
}

function frame(opcode, payload = '') {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
  if (data.length < 126) return Buffer.concat([Buffer.from([0x80 | opcode, data.length]), data]);
  if (data.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x80 | opcode; header[1] = 126; header.writeUInt16BE(data.length, 2);
    return Buffer.concat([header, data]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x80 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(data.length), 2);
  return Buffer.concat([header, data]);
}

function send(socket, payload) {
  if (socket.destroyed || socket.readyState !== 'open') return;
  try { socket.write(frame(0x1, JSON.stringify(payload))); } catch { closeSocket(socket); }
}

function addClient(userId, socket) {
  const set = clients.get(userId) || new Set();
  set.add(socket);
  clients.set(userId, set);
}

function removeClient(socket) {
  if (!socket.userId) return;
  const set = clients.get(socket.userId);
  if (!set) return;
  set.delete(socket);
  if (!set.size) clients.delete(socket.userId);
}

function closeSocket(socket) {
  sockets.delete(socket);
  removeClient(socket);
  if (socket.authTimer) clearTimeout(socket.authTimer);
  try { socket.end(); } catch {}
}

function sendToUser(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  for (const socket of set) send(socket, payload);
}

function broadcastToUsers(userIds, payload) {
  for (const userId of new Set(userIds.filter(Boolean))) sendToUser(userId, payload);
}

function conversationMembers(conversationId) {
  return db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ?').all(conversationId).map((row) => row.user_id);
}

function authenticate(socket, token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.userId) throw new Error('Invalid token');
    socket.userId = payload.userId;
    addClient(socket.userId, socket);
    if (socket.authTimer) clearTimeout(socket.authTimer);
    send(socket, { type: 'ready', userId: socket.userId });
    return true;
  } catch {
    send(socket, { type: 'error', code: 'AUTH_FAILED', message: 'Authentication failed.' });
    closeSocket(socket);
    return false;
  }
}

function handleFrame(socket, opcode, payload) {
  if (opcode === 0x8) return closeSocket(socket);
  if (opcode === 0x9) { try { socket.write(frame(0xA, payload)); } catch { closeSocket(socket); } return; }
  if (opcode !== 0x1 || payload.length > MAX_FRAME_BYTES) return closeSocket(socket);

  let message;
  try { message = JSON.parse(payload.toString('utf8')); } catch { return; }
  if (!socket.userId) {
    if (message?.type === 'auth' && typeof message.token === 'string') authenticate(socket, message.token);
    return;
  }

  if (message?.type === 'ping') {
    send(socket, { type: 'pong' });
    return;
  }

  if (message?.type === 'typing' && typeof message.conversationId === 'string') {
    const members = conversationMembers(message.conversationId);
    if (!members.includes(socket.userId)) return;
    broadcastToUsers(members.filter((id) => id !== socket.userId), {
      type: 'typing',
      conversationId: message.conversationId,
      userId: socket.userId,
      isTyping: Boolean(message.isTyping),
    });
  }
}

function parseFrames(socket) {
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const first = buffer[0];
      const second = buffer[1];
      const fin = Boolean(first & 0x80);
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (!fin) return closeSocket(socket);
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2); offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        const big = buffer.readBigUInt64BE(2);
        if (big > BigInt(MAX_FRAME_BYTES)) return closeSocket(socket);
        length = Number(big); offset = 10;
      }
      if (!masked) return closeSocket(socket);
      if (buffer.length < offset + 4 + length) return;
      const mask = buffer.subarray(offset, offset + 4); offset += 4;
      const payload = Buffer.from(buffer.subarray(offset, offset + length));
      buffer = buffer.subarray(offset + length);
      for (let i = 0; i < payload.length; i += 1) payload[i] ^= mask[i % 4];
      handleFrame(socket, opcode, payload);
      if (socket.destroyed) return;
    }
  });
}

function attach(server) {
  server.on('upgrade', (request, socket) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/ws') return;
    const key = request.headers['sec-websocket-key'];
    if (!key || request.headers['sec-websocket-version'] !== '13') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`,
      '\r\n',
    ].join('\r\n'));
    socket.setNoDelay(true);
    socket.readyState = 'open';
    sockets.add(socket);
    socket.authTimer = setTimeout(() => {
      if (!socket.userId) closeSocket(socket);
    }, AUTH_TIMEOUT_MS);
    socket.on('error', () => closeSocket(socket));
    socket.on('close', () => closeSocket(socket));
    parseFrames(socket);
  });

  const heartbeat = setInterval(() => {
    for (const socket of sockets) {
      if (socket.destroyed) closeSocket(socket);
      else send(socket, { type: 'heartbeat' });
    }
  }, HEARTBEAT_MS);
  heartbeat.unref?.();
  return () => clearInterval(heartbeat);
}

function broadcastToConversation(conversationId, userIds, message) {
  broadcastToUsers(userIds, { type: 'message.created', conversationId, message });
}

function broadcastRead(conversationId, userIds, readAt) {
  broadcastToUsers(userIds, { type: 'message.read', conversationId, readAt });
}

module.exports = { attach, broadcastToConversation, broadcastRead };
