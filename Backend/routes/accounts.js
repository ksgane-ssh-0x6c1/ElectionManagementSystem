const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');
router.use(authenticate);

router.get('/', allowRoles('DBA', 'Election Officer'), async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, role, full_name, username, email, is_active, created_at FROM users ORDER BY id DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch('/:id/status', allowRoles('DBA', 'Election Officer'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false.' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    const [result] = await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Account not found.' });
    res.json({ message: 'Account status updated.' });
  } catch (e) { next(e); }
});

router.delete('/:id', allowRoles('DBA'), async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Account not found.' });
    res.json({ message: 'Account deleted.' });
  } catch (e) { next(e); }
});
module.exports = router;