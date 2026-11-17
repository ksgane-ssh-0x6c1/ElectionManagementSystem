const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

// Public results are available only after an election has been published.
router.get('/:electionId', async (req, res, next) => {
  try {
    const [elections] = await db.execute(
      "SELECT id, name, election_date, status FROM elections WHERE id = ? AND status = 'Published'",
      [req.params.electionId]
    );
    if (!elections.length) return res.status(404).json({ error: 'Published results not found.' });

    const [rows] = await db.execute(
      `SELECT c.id AS candidate_id, c.candidate_name, p.party_name,
        COUNT(b.id) AS vote_count
       FROM election_candidates ec
       JOIN candidates c ON c.id = ec.candidate_id
       LEFT JOIN parties p ON p.id = c.party_id
       LEFT JOIN ballots b ON b.election_id = ec.election_id AND b.candidate_id = c.id
       WHERE ec.election_id = ?
       GROUP BY c.id, c.candidate_name, p.party_name
       ORDER BY vote_count DESC, c.candidate_name`,
      [req.params.electionId]
    );
    res.json({ election: elections[0], results: rows });
  } catch (err) { next(err); }
});

// Staff see aggregate turnout only, never voter-to-candidate records.
router.get('/', authenticate, allowRoles('Election Officer', 'DBA'), async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT e.id, e.name, e.election_date, e.status,
        COUNT(vp.voter_id) AS total_votes
       FROM elections e
       LEFT JOIN voter_participation vp ON vp.election_id = e.id
       GROUP BY e.id
       ORDER BY e.election_date DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
