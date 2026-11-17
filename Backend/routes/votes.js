const crypto = require('crypto');
const router = require('express').Router();
const db = require('../config/db');
const { authenticate, allowRoles } = require('../middleware/auth');

router.use(authenticate, allowRoles('Voter'));

router.get('/eligibility/:electionId', async (req, res, next) => {
  try {
    const [voters] = await db.execute('SELECT id FROM voters WHERE user_id = ?', [req.user.id]);
    if (!voters.length) return res.status(404).json({ error: 'Voter profile not found.' });

    const [rows] = await db.execute(
      `SELECT e.id, e.name, e.election_date, e.status,
        EXISTS(SELECT 1 FROM voter_participation vp WHERE vp.election_id = e.id AND vp.voter_id = ?) AS hasVoted,
        EXISTS(SELECT 1 FROM voter_applications a WHERE a.voter_id = ? AND a.status = 'Approved') AS applicationApproved
       FROM elections e WHERE e.id = ?`,
      [voters[0].id, voters[0].id, req.params.electionId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Election not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  let connection;
  try {
    const { electionId, candidateId } = req.body;
    if (!electionId || !candidateId) {
      return res.status(400).json({ error: 'electionId and candidateId are required.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock the voter's profile so simultaneous submissions serialize for this voter.
    const [voters] = await connection.execute(
      'SELECT id FROM voters WHERE user_id = ? FOR UPDATE', [req.user.id]
    );
    if (!voters.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Voter profile not found.' });
    }

    const [elections] = await connection.execute(
      "SELECT id FROM elections WHERE id = ? AND status = 'Open' AND election_date <= CURDATE() FOR UPDATE",
      [electionId]
    );
    if (!elections.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'This election is not currently open for voting.' });
    }

    const [approved] = await connection.execute(
      "SELECT id FROM voter_applications WHERE voter_id = ? AND status = 'Approved' LIMIT 1",
      [voters[0].id]
    );
    if (!approved.length) {
      await connection.rollback();
      return res.status(403).json({ error: 'An approved voter application is required before voting.' });
    }

    const [candidate] = await connection.execute(
      'SELECT id FROM election_candidates WHERE election_id = ? AND candidate_id = ?',
      [electionId, candidateId]
    );
    if (!candidate.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Candidate is not registered for this election.' });
    }

    // These inserts share a transaction for consistency, but deliberately share no key.
    // voter_participation records that this voter has voted; ballots stores only the choice.
    await connection.execute(
      'INSERT INTO voter_participation (election_id, voter_id) VALUES (?, ?)',
      [electionId, voters[0].id]
    );
    await connection.execute(
      'INSERT INTO ballots (id, election_id, candidate_id) VALUES (?, ?, ?)',
      [crypto.randomUUID(), electionId, candidateId]
    );

    await connection.commit();
    res.status(201).json({ message: 'Your ballot was recorded. Your identity is stored separately from the ballot choice.' });
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A participation record already exists for this voter in this election.' });
    }
    next(err);
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
