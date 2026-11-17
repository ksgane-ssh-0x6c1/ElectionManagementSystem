const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
router.use(authenticate);

const applicationTypes = ['New Registration', 'Update Details', 'Address Change', 'Replacement'];
const reviewStatuses = ['Approved', 'Rejected', 'Needs Information'];

router.post('/', allowRoles('Voter'), async (req, res, next) => {
  try {
    const { applicationType, dob, phone, address, boothId } = req.body;
    if (!applicationTypes.includes(applicationType) || !dob || !phone?.trim() || !address?.trim()) {
      return res.status(400).json({ error: 'Choose a valid application type and provide date of birth, phone, and address.' });
    }
    const [voters] = await db.execute('SELECT id FROM voters WHERE user_id = ?', [req.user.id]);
    if (!voters.length) return res.status(404).json({ error: 'Voter profile not found.' });
    const reference = `APP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const [result] = await db.execute(
      'INSERT INTO voter_applications (reference_code, voter_id, application_type, dob, phone, address, booth_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [reference, voters[0].id, applicationType, dob, phone.trim(), address.trim(), boothId || null]
    );
    res.status(201).json({ id: result.insertId, referenceCode: reference, status: 'Pending' });
  } catch (err) { next(err); }
});

router.get('/mine', allowRoles('Voter'), async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT a.id, a.reference_code, a.application_type, a.status, a.review_notes, a.created_at FROM voter_applications a JOIN voters v ON v.id = a.voter_id WHERE v.user_id = ? ORDER BY a.id DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/', allowRoles('BLO', 'Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT a.id, a.reference_code, a.application_type, a.dob, a.phone, a.address, a.status, a.review_notes, a.created_at, u.full_name AS voter_name, b.code AS booth_code FROM voter_applications a JOIN voters v ON v.id = a.voter_id JOIN users u ON u.id = v.user_id LEFT JOIN booths b ON b.id = a.booth_id ORDER BY a.id DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch('/:id/review', allowRoles('BLO', 'Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!reviewStatuses.includes(status)) return res.status(400).json({ error: 'Select Approved, Rejected, or Needs Information.' });
    const [existing] = await db.execute('SELECT id FROM voter_applications WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Application not found.' });
    await db.execute(
      'UPDATE voter_applications SET status = ?, review_notes = ?, reviewed_by = ? WHERE id = ?',
      [status, reviewNotes?.trim() || null, req.user.id, req.params.id]
    );
    res.json({ message: 'Application review saved.' });
  } catch (err) { next(err); }
});

router.get('/track/:reference', allowRoles('Voter', 'BLO', 'Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const sql = req.user.role === 'Voter'
      ? 'SELECT a.id, a.reference_code, a.application_type, a.status, a.review_notes, a.created_at FROM voter_applications a JOIN voters v ON v.id = a.voter_id WHERE a.reference_code = ? AND v.user_id = ?'
      : 'SELECT id, reference_code, application_type, status, review_notes, created_at FROM voter_applications WHERE reference_code = ?';
    const params = req.user.role === 'Voter' ? [req.params.reference, req.user.id] : [req.params.reference];
    const [rows] = await db.execute(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Application not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
