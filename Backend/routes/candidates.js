const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT c.id, c.candidate_name, c.constituency, c.contact_email, c.bio, c.party_id, p.party_name FROM candidates c LEFT JOIN parties p ON p.id = c.party_id ORDER BY c.candidate_name'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/me', authenticate, allowRoles('Candidate'), async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, candidate_name, party_id, constituency, contact_email, bio FROM candidates WHERE user_id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Candidate profile not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/mine', authenticate, allowRoles('Party'), async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT c.id, c.candidate_name, c.constituency, c.contact_email, c.bio, p.party_name FROM candidates c JOIN parties p ON p.id = c.party_id WHERE p.user_id = ? ORDER BY c.candidate_name',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/me', authenticate, allowRoles('Candidate'), async (req, res, next) => {
  try {
    const { candidateName, partyId, constituency, contactEmail, bio } = req.body;
    const [existing] = await db.execute('SELECT id FROM candidates WHERE user_id = ?', [req.user.id]);
    if (!existing.length) return res.status(404).json({ error: 'Candidate profile not found.' });
    await db.execute(
      'UPDATE candidates SET candidate_name = COALESCE(?, candidate_name), party_id = ?, constituency = ?, contact_email = COALESCE(?, contact_email), bio = ? WHERE user_id = ?',
      [candidateName?.trim() || null, partyId || null, constituency ?? null, contactEmail?.trim().toLowerCase() || null, bio ?? null, req.user.id]
    );
    res.json({ message: 'Candidate profile updated.' });
  } catch (err) { next(err); }
});

router.post('/', authenticate, allowRoles('Party', 'Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { candidateName, partyId, constituency, contactEmail, bio } = req.body;
    if (!candidateName?.trim()) return res.status(400).json({ error: 'candidateName is required.' });
    let effectivePartyId = partyId || null;
    if (req.user.role === 'Party') {
      const [party] = await db.execute('SELECT id FROM parties WHERE user_id = ?', [req.user.id]);
      if (!party.length) return res.status(404).json({ error: 'Party profile not found.' });
      effectivePartyId = party[0].id;
    }
    const [result] = await db.execute(
      'INSERT INTO candidates (candidate_name, party_id, constituency, contact_email, bio) VALUES (?, ?, ?, ?, ?)',
      [candidateName.trim(), effectivePartyId, constituency || null, contactEmail || null, bio || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Candidate created.' });
  } catch (err) { next(err); }
});

module.exports = router;
