CREATE DATABASE IF NOT EXISTS ems_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ems_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('Voter','Party','Candidate','BLO','Election Officer','DBA') NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booths (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  area VARCHAR(120),
  address TEXT
);

CREATE TABLE IF NOT EXISTS voters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  phone VARCHAR(25),
  address TEXT,
  dob DATE,
  booth_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  party_name VARCHAR(150) NOT NULL,
  symbol VARCHAR(100),
  contact_email VARCHAR(254),
  manifesto TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  candidate_name VARCHAR(150) NOT NULL,
  party_id INT,
  constituency VARCHAR(150),
  contact_email VARCHAR(254),
  bio TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS elections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  election_date DATE NOT NULL,
  status ENUM('Draft','Scheduled','Open','Closed','Published') NOT NULL DEFAULT 'Draft',
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS election_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  booth_id INT,
  UNIQUE KEY uq_election_candidate (election_id,candidate_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS voter_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_code VARCHAR(40) NOT NULL UNIQUE,
  voter_id INT NOT NULL,
  application_type ENUM('New Registration','Update Details','Address Change','Replacement') NOT NULL,
  dob DATE NOT NULL,
  phone VARCHAR(25) NOT NULL,
  address TEXT NOT NULL,
  booth_id INT,
  status ENUM('Pending','Approved','Rejected','Needs Information') NOT NULL DEFAULT 'Pending',
  review_notes TEXT,
  reviewed_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- This table records only that a voter participated in an election.
-- The composite primary key enforces one participation record per voter/election.
-- No candidate choice or submission timestamp is stored here.
CREATE TABLE IF NOT EXISTS voter_participation (
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  PRIMARY KEY (election_id, voter_id),
  INDEX idx_participation_voter (voter_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE RESTRICT,
  FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE RESTRICT
);

-- Ballots contain a random UUID and the election/candidate choice only.
-- There is no voter_id, user_id, participation_id or timestamp in this table.
-- The composite FK ensures the selected candidate is assigned to the election.
CREATE TABLE IF NOT EXISTS ballots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  election_id INT NOT NULL,
  candidate_id INT NOT NULL,
  INDEX idx_ballots_election_candidate (election_id, candidate_id),
  CONSTRAINT fk_ballot_election_candidate FOREIGN KEY (election_id, candidate_id)
    REFERENCES election_candidates(election_id, candidate_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_verification_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Guardrails: participation and ballots are append-only through ordinary SQL DML.
-- A database owner can still deliberately remove/disable triggers or alter the schema.
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
