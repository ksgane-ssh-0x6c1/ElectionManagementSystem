-- Run as a MySQL administrator AFTER schema.sql (or the required migrations).
-- Change the sample password before running. Use the same password in Backend/.env.
-- The app account has no UPDATE/DELETE permission on ballots or voter_participation.
-- Both host entries are created because local MySQL may match either host name.

CREATE USER IF NOT EXISTS 'ems_user'@'127.0.0.1' IDENTIFIED BY 'CHANGE_THIS_TO_A_STRONG_PASSWORD';
CREATE USER IF NOT EXISTS 'ems_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_TO_A_STRONG_PASSWORD';

-- If this user was created by an older Electra guide with ALL PRIVILEGES ON ems_db.* ,
-- uncomment the matching REVOKE line(s) below before running the GRANT statements.
-- (Do not uncomment for a brand-new user with no previous database-wide grants.)
-- REVOKE ALL PRIVILEGES ON ems_db.* FROM 'ems_user'@'127.0.0.1';
-- REVOKE ALL PRIVILEGES ON ems_db.* FROM 'ems_user'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.users TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.booths TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.voters TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.parties TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.candidates TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.elections TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.election_candidates TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.voter_applications TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, DELETE ON ems_db.email_verification_tokens TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT, DELETE ON ems_db.password_reset_tokens TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT ON ems_db.voter_participation TO 'ems_user'@'127.0.0.1';
GRANT SELECT, INSERT ON ems_db.ballots TO 'ems_user'@'127.0.0.1';

GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.users TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.booths TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.voters TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.parties TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.candidates TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.elections TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.election_candidates TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON ems_db.voter_applications TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, DELETE ON ems_db.email_verification_tokens TO 'ems_user'@'localhost';
GRANT SELECT, INSERT, DELETE ON ems_db.password_reset_tokens TO 'ems_user'@'localhost';
GRANT SELECT, INSERT ON ems_db.voter_participation TO 'ems_user'@'localhost';
GRANT SELECT, INSERT ON ems_db.ballots TO 'ems_user'@'localhost';

FLUSH PRIVILEGES;
