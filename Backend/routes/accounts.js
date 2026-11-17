const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const { issueToken } = require('../services/account-tokens');
const { sendAccountLink } = require('../services/mailer');
router.use(authenticate, allowRoles('DBA'));

router.post('/', async (req, res, next) => {
  const bcrypt = require('bcryptjs');
  let connection;
  try {
    const { role, fullName, username, email, password } = req.body;
    if (!['BLO', 'Election Officer'].includes(role)) return res.status(400).json({ error: 'Only BLO and Election Officer accounts can be provisioned here.' });
    if (!fullName?.trim() || !/^[A-Za-z0-9_]{4,40}$/.test(username || '') || !/^\S+@\S+\.\S+$/.test(email || '') || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Provide a name, valid username, email, and password of at least 8 characters.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existing.length) return res.status(409).json({ error: 'Username or email already exists.' });
    connection = await db.getConnection();
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.execute(
      'INSERT INTO users (role, full_name, username, email, password_hash, email_verified) VALUES (?, ?, ?, ?, ?, FALSE)',
      [role, fullName.trim(), cleanUsername, cleanEmail, passwordHash]
    );
    const token = await issueToken(connection, 'verify', result.insertId);
    await connection.commit();
    let delivery = 'failed';
    try {
      delivery = await sendAccountLink({
        to: cleanEmail, name: fullName.trim(), subject: 'Verify your Electra staff account',
        intro: 'A project administrator created your Electra staff account. Verify this email address before signing in.',
        page: 'verify-email.html', token, actionLabel: 'Verify email address'
      });
    } catch (mailError) { console.error('Staff verification email could not be sent:', mailError.message); }
    const message = delivery === 'console'
      ? `${role} account created. Open the verification link printed in the backend terminal.`
      : delivery === 'smtp'
        ? `${role} account created. The user must verify the email address before signing in.`
        : `${role} account created, but its verification email could not be sent. Configure SMTP and resend verification.`;
    res.status(201).json({ id: result.insertId, message, emailDelivery: delivery });
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username or email already exists.' });
    next(err);
  } finally { if (connection) connection.release(); }
});

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, role, full_name, username, email, is_active, email_verified, created_at FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false.' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    const [result] = await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Account not found.' });
    res.json({ message: 'Account status updated.' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    const [target] = await db.execute('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!target.length) return res.status(404).json({ error: 'Account not found.' });
    if (target[0].role === 'DBA') return res.status(400).json({ error: 'DBA accounts cannot be deleted from this screen.' });
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Account deleted.' });
  } catch (err) { next(err); }
});
module.exports = router;
