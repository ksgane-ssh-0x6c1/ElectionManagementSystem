const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { issueToken, findValidToken, deleteToken } = require('../services/account-tokens');
const { sendAccountLink } = require('../services/mailer');

const publicRoles = ['Voter', 'Party', 'Candidate'];
const GENERIC_RECOVERY_MESSAGE = 'If an active account exists for that email address, instructions will be sent shortly.';

async function sendVerification(user, token) {
  return sendAccountLink({
    to: user.email, name: user.full_name, subject: 'Verify your Electra email address',
    intro: 'Please verify your email address to activate your Electra account.',
    page: 'verify-email.html', token, actionLabel: 'Verify email address'
  });
}

async function sendReset(user, token) {
  return sendAccountLink({
    to: user.email, name: user.full_name, subject: 'Reset your Electra password',
    intro: 'A password reset was requested for your Electra account. This link expires in one hour.',
    page: 'reset-password.html', token, actionLabel: 'Choose a new password'
  });
}

router.post('/register', async (req, res, next) => {
  let connection;
  try {
    const { role, fullName, username, email, password } = req.body;
    if (!publicRoles.includes(role)) return res.status(400).json({ error: 'Public registration is only available for Voter, Party, and Candidate.' });
    if (!fullName?.trim() || !/^[A-Za-z0-9_]{4,40}$/.test(username || '') || !/^\S+@\S+\.\S+$/.test(email || '') || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Enter a name, a 4–40 character username (letters, numbers, underscore), a valid email, and a password of at least 8 characters.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existing.length) return res.status(409).json({ error: 'Username or email already exists.' });
    connection = await db.getConnection();
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await connection.execute(
      'INSERT INTO users (role, full_name, username, email, password_hash, email_verified) VALUES (?, ?, ?, ?, ?, FALSE)',
      [role, fullName.trim(), cleanUsername, cleanEmail, passwordHash]
    );
    if (role === 'Voter') await connection.execute('INSERT INTO voters (user_id) VALUES (?)', [user.insertId]);
    if (role === 'Party') await connection.execute('INSERT INTO parties (user_id, party_name, contact_email) VALUES (?, ?, ?)', [user.insertId, fullName.trim(), cleanEmail]);
    if (role === 'Candidate') await connection.execute('INSERT INTO candidates (user_id, candidate_name, contact_email) VALUES (?, ?, ?)', [user.insertId, fullName.trim(), cleanEmail]);
    const token = await issueToken(connection, 'verify', user.insertId);
    await connection.commit();

    let delivery = 'failed';
    try { delivery = await sendVerification({ email: cleanEmail, full_name: fullName.trim() }, token); }
    catch (mailError) { console.error('Verification email could not be sent:', mailError.message); }
    const message = delivery === 'console'
      ? 'Account created. For local development, open the verification link printed in the backend terminal.'
      : delivery === 'smtp'
        ? 'Account created. Check your inbox and verify your email before signing in.'
        : 'Account created, but the verification email could not be sent. Configure SMTP and use Resend verification.';
    res.status(201).json({ message, emailDelivery: delivery });
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already exists.' });
    next(err);
  } finally { if (connection) connection.release(); }
});

router.post('/verify-email', async (req, res, next) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const tokenRow = await findValidToken(connection, 'verify', req.body.token);
    if (!tokenRow) {
      await connection.rollback();
      return res.status(400).json({ error: 'This verification link is invalid or has expired. Request a new verification email.' });
    }
    await connection.execute('UPDATE users SET email_verified = TRUE, email_verified_at = UTC_TIMESTAMP() WHERE id = ?', [tokenRow.user_id]);
    await deleteToken(connection, 'verify', tokenRow.id);
    await connection.execute('DELETE FROM email_verification_tokens WHERE user_id = ?', [tokenRow.user_id]);
    await connection.commit();
    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally { if (connection) connection.release(); }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (/^\S+@\S+\.\S+$/.test(email)) {
      const [rows] = await db.execute('SELECT id, full_name, email FROM users WHERE email = ? AND is_active = TRUE AND email_verified = FALSE LIMIT 1', [email]);
      if (rows.length) {
        const [recent] = await db.execute('SELECT id FROM email_verification_tokens WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1', [rows[0].id]);
        if (!recent.length) {
          const token = await issueToken(db, 'verify', rows[0].id);
          try { await sendVerification(rows[0], token); }
          catch (mailError) { console.error('Verification email could not be sent:', mailError.message); }
        }
      }
    }
    res.json({ message: GENERIC_RECOVERY_MESSAGE });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username?.trim() || !password || !role) return res.status(400).json({ error: 'Username, password, and role are required.' });
    const [rows] = await db.execute(
      'SELECT id, role, full_name, username, email, password_hash, is_active, email_verified FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), username.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.is_active || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials or role.' });
    }
    if (!user.email_verified) return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', error: 'Please verify your email address before signing in.' });
    const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, process.env.JWT_SECRET, { expiresIn: '4h' });
    res.json({ token, user: { id: user.id, role: user.role, fullName: user.full_name, username: user.username, email: user.email } });
  } catch (err) { next(err); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (/^\S+@\S+\.\S+$/.test(email)) {
      const [rows] = await db.execute('SELECT id, full_name, email FROM users WHERE email = ? AND is_active = TRUE AND email_verified = TRUE LIMIT 1', [email]);
      if (rows.length) {
        const [recent] = await db.execute('SELECT id FROM password_reset_tokens WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) LIMIT 1', [rows[0].id]);
        if (!recent.length) {
          const token = await issueToken(db, 'reset', rows[0].id);
          try { await sendReset(rows[0], token); }
          catch (mailError) { console.error('Password reset email could not be sent:', mailError.message); }
        }
      }
    }
    res.json({ message: GENERIC_RECOVERY_MESSAGE });
  } catch (err) { next(err); }
});

router.post('/reset-password', async (req, res, next) => {
  let connection;
  try {
    const { token, password } = req.body;
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Choose a password with at least 8 characters.' });
    connection = await db.getConnection();
    await connection.beginTransaction();
    const tokenRow = await findValidToken(connection, 'reset', token);
    if (!tokenRow) {
      await connection.rollback();
      return res.status(400).json({ error: 'This password reset link is invalid or has expired. Request another link.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenRow.user_id]);
    await deleteToken(connection, 'reset', tokenRow.id);
    await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [tokenRow.user_id]);
    await connection.commit();
    res.json({ message: 'Password updated successfully. Sign in with your new password.' });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally { if (connection) connection.release(); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, role, full_name, username, email FROM users WHERE id = ? AND is_active = TRUE AND email_verified = TRUE', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Account not found, inactive, or not verified.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});
module.exports = router;
