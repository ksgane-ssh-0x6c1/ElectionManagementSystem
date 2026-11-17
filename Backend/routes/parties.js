const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, party_name, symbol, contact_email, manifesto FROM parties ORDER BY party_name');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/me', authenticate, allowRoles('Party'), async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, party_name, symbol, contact_email, manifesto FROM parties WHERE user_id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Party profile not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/me', authenticate, allowRoles('Party'), async (req, res, next) => {
  try {
    const { partyName, symbol, contactEmail, manifesto } = req.body;
    const [existing] = await db.execute('SELECT id FROM parties WHERE user_id = ?', [req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Party profile not found.' });
    await db.execute(
      'UPDATE parties SET party_name = COALESCE(?, party_name), symbol = ?, contact_email = COALESCE(?, contact_email), manifesto = ? WHERE user_id = ?',
      [partyName?.trim() || null, symbol ?? null, contactEmail?.trim().toLowerCase() || null, manifesto ?? null, req.user.id]
    );
    res.json({ message: 'Party profile updated.' });
  } catch (err) { next(err); }
});

router.post('/', authenticate, allowRoles('Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { partyName, symbol, contactEmail, manifesto } = req.body;
    if (!partyName?.trim()) return res.status(400).json({ error: 'partyName is required.' });
    const [result] = await db.execute(
      'INSERT INTO parties (party_name, symbol, contact_email, manifesto) VALUES (?, ?, ?, ?)',
      [partyName.trim(), symbol || null, contactEmail || null, manifesto || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Party created.' });
  } catch (err) { next(err); }
});

module.exports = router;
