-- Run this ONCE on an existing Electra database that still has the old `votes` table.
-- Back up ems_db first. Existing vote rows directly link voters and candidate choices.
-- This copies turnout and candidate totals to separate tables, then drops that old link.
-- It cannot erase old backups, exports, binary logs, screenshots or copies of the old table.
-- For a new installation, run schema.sql instead and do NOT run this migration.
USE ems_db;

CREATE TABLE IF NOT EXISTS voter_participation (
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  PRIMARY KEY (election_id, voter_id),
  INDEX idx_participation_voter (voter_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
  FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ballots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  INDEX idx_ballots_election_candidate (election_id, candidate_id),
  CONSTRAINT fk_ballot_election_candidate FOREIGN KEY (election_id, candidate_id)
    REFERENCES election_candidates(election_id, candidate_id) ON DELETE RESTRICT
);

-- Keep only voter/election participation in one table and choices in another.
-- No shared ID or timestamp is copied between these tables.
INSERT IGNORE INTO voter_participation (election_id, voter_id)
SELECT DISTINCT election_id, voter_id FROM votes;

INSERT INTO ballots (id, election_id, candidate_id)
SELECT UUID(), election_id, candidate_id FROM votes;

-- Remove the old table that directly exposed voter_id + candidate_id together.
DROP TABLE votes;

-- These triggers are created after migration so old ballots can be copied even
-- if their elections are now closed or published.
DELIMITER $$
DROP TRIGGER IF EXISTS validate_ballots_insert$$
CREATE TRIGGER validate_ballots_insert
BEFORE INSERT ON ballots FOR EACH ROW
BEGIN
  DECLARE election_is_open INT DEFAULT 0;
  SELECT COUNT(*) INTO election_is_open
  FROM elections e
  WHERE e.id = NEW.election_id
    AND e.status = 'Open'
    AND e.election_date <= CURDATE();
  IF election_is_open = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ballots can only be added to an open election on or after its scheduled date.';
  END IF;
END$$

DROP TRIGGER IF EXISTS prevent_ballots_update$$
CREATE TRIGGER prevent_ballots_update
BEFORE UPDATE ON ballots FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ballot records are append-only.';
END$$

DROP TRIGGER IF EXISTS prevent_ballots_delete$$
CREATE TRIGGER prevent_ballots_delete
BEFORE DELETE ON ballots FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ballot records are append-only.';
END$$

DROP TRIGGER IF EXISTS prevent_participation_update$$
CREATE TRIGGER prevent_participation_update
BEFORE UPDATE ON voter_participation FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participation records are append-only.';
END$$

DROP TRIGGER IF EXISTS prevent_participation_delete$$
CREATE TRIGGER prevent_participation_delete
BEFORE DELETE ON voter_participation FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participation records are append-only.';
END$$
DELIMITER ;
