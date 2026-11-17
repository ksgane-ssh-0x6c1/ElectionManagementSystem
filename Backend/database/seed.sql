USE ems_db;
INSERT INTO booths (code,name,area,address) VALUES
('BTH-001','Central Booth','Central Area','Sample address')
ON DUPLICATE KEY UPDATE name=VALUES(name);
-- Create the first Election Officer / DBA account through a one-time local seed script
-- or register a normal account and promote its role manually for this academic demo.
-- Never use a hard-coded production password in this file.
