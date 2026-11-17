const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
const statuses = ['Draft', 'Scheduled', 'Open', 'Closed', 'Published'];

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, name, description, election_date, status FROM elections ORDER BY election_date DESC, id DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id/candidates', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT c.id, c.candidate_name, c.constituency, p.party_name FROM election_candidates ec JOIN candidates c ON c.id = ec.candidate_id LEFT JOIN parties p ON p.id = c.party_id WHERE ec.election_id = ? ORDER BY c.candidate_name',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', authenticate, allowRoles('Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { name, description, electionDate, status } = req.body;
    if (!name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(electionDate || '')) return res.status(400).json({ error: 'A name and valid electionDate (YYYY-MM-DD) are required.' });
    if (status && !statuses.includes(status)) return res.status(400).json({ error: 'Invalid election status.' });
    const [result] = await db.execute(
      'INSERT INTO elections (name, description, election_date, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), description || null, electionDate, status || 'Draft', req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Election created.' });
  } catch (err) { next(err); }
});

router.patch('/:id/status', authenticate, allowRoles('Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!statuses.includes(status)) return res.status(400).json({ error: 'Invalid election status.' });
    const [existing] = await db.execute('SELECT id FROM elections WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Election not found.' });
    await db.execute('UPDATE elections SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Election status updated.' });
  } catch (err) { next(err); }
});

router.post('/:id/candidates', authenticate, allowRoles('Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { candidateId, boothId } = req.body;
    if (!candidateId) return res.status(400).json({ error: 'candidateId is required.' });
    await db.execute('INSERT INTO election_candidates (election_id, candidate_id, booth_id) VALUES (?, ?, ?)', [req.params.id, candidateId, boothId || null]);
    res.status(201).json({ message: 'Candidate added to election.' });
  } catch (err) { next(err); }
});

module.exports = router;
