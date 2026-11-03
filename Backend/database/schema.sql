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
  phone VARCHAR(25), address TEXT, dob DATE, booth_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  party_name VARCHAR(150) NOT NULL,
  symbol VARCHAR(100), contact_email VARCHAR(254), manifesto TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  candidate_name VARCHAR(150) NOT NULL,
  party_id INT, constituency VARCHAR(150), contact_email VARCHAR(254), bio TEXT,
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
  dob DATE NOT NULL, phone VARCHAR(25) NOT NULL, address TEXT NOT NULL,
  booth_id INT,
  status ENUM('Pending','Approved','Rejected','Needs Information') NOT NULL DEFAULT 'Pending',
  review_notes TEXT, reviewed_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
  FOREIGN KEY (booth_id) REFERENCES booths(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS votes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  election_id INT NOT NULL,
  voter_id INT NOT NULL,
  candidate_id INT NOT NULL,
  cast_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_one_vote_per_election (election_id,voter_id),
  FOREIGN KEY (election_id) REFERENCES elections(id),
  FOREIGN KEY (voter_id) REFERENCES voters(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);
