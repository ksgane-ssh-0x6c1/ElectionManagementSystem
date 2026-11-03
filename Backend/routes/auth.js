const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const publicRoles = ['Voter', 'Party', 'Candidate'];

router.post('/register', async (req, res, next) => {
  try {
    const { role, fullName, username, email, password } = req.body;
    if (!publicRoles.includes(role)) return res.status(400).json({ error: 'Public registration is only available for Voter, Party, and Candidate.' });
    if (!fullName || !username || !email || !password || password.length < 8) return res.status(400).json({ error: 'Provide fullName, username, email, and a password of at least 8 characters.' });
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ error: 'Username or email already exists.' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const hash = await bcrypt.hash(password, 12);
      const [user] = await conn.execute('INSERT INTO users (role, full_name, username, email, password_hash) VALUES (?, ?, ?, ?, ?)', [role, fullName.trim(), username.trim(), email.trim().toLowerCase(), hash]);
      if (role === 'Voter') await conn.execute('INSERT INTO voters (user_id) VALUES (?)', [user.insertId]);
      if (role === 'Party') await conn.execute('INSERT INTO parties (user_id, party_name, contact_email) VALUES (?, ?, ?)', [user.insertId, fullName.trim(), email.trim().toLowerCase()]);
      if (role === 'Candidate') await conn.execute('INSERT INTO candidates (user_id, candidate_name, contact_email) VALUES (?, ?, ?)', [user.insertId, fullName.trim(), email.trim().toLowerCase()]);
      await conn.commit();
      res.status(201).json({ message: 'Account created. You can now log in.' });
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'Username, password, and role are required.' });
    const [rows] = await db.execute('SELECT id, role, full_name, username, email, password_hash, is_active FROM users WHERE username = ? OR email = ? LIMIT 1', [username.trim(), username.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !user.is_active || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials or role.' });
    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '4h' });
    res.json({ token, user: { id: user.id, role: user.role, fullName: user.full_name, username: user.username, email: user.email } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, role, full_name, username, email FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});
module.exports = router;