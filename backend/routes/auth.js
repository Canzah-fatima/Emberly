const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const EMBER_COLORS = ['#B4182D', '#FDA481', '#54162B', '#37415C', '#242E49'];

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    bio: u.bio,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url,
    isPrivate: !!u.is_private,
    createdAt: u.created_at,
  };
}

router.post('/register', (req, res) => {
  const { username, email, password, fullName } = req.body;

  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedFullName = String(fullName || '').trim();
  const normalizedPassword = String(password || '');
  if (!normalizedUsername || !email || !normalizedPassword || !normalizedFullName) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _ or .)' });
  }
  if (normalizedFullName.length > 80) {
    return res.status(400).json({ error: 'Full name must be 80 characters or fewer.' });
  }
  if (normalizedPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
    .get(normalizedUsername, normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'Username or email is already taken.' });
  }

  const id = uuidv4();
  const hashed = bcrypt.hashSync(normalizedPassword, 10);
  const color = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];

  db.prepare(`
    INSERT INTO users (id, username, email, password, full_name, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username.toLowerCase(), email.toLowerCase(), hashed, fullName, color);

  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, username, identifier, password } = req.body;
  const loginIdentifier = String(identifier ?? email ?? username ?? '').trim().toLowerCase();
  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Email or username and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(loginIdentifier, loginIdentifier);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Incorrect email/username or password.' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
