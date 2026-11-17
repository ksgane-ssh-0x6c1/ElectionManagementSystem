# Electra implementation status

## Integrated features

- Public account registration for Voter, Party and Candidate, with bcrypt password hashing and mandatory email verification for new accounts.
- Role-specific login and protected dashboards using JWT bearer tokens.
- Controlled first-DBA creation through `npm run create-admin`; terminal-created DBA is marked verified.
- One-time email-verification links, resend-verification flow, forgotten-password emails and one-time password reset links. Tokens are stored as SHA-256 hashes and expire automatically.
- DBA provisioning and activation/deactivation/deletion of BLO and Election Officer accounts.
- Voter profile editing, voter application submission, private application tracking and booth lookup.
- BLO and Election Officer application review.
- Party profile editing and candidate registration; candidate profile editing and public candidate directory.
- Election creation, election status updates, candidate assignment and optional booth assignment.
- Voter eligibility checks and one-participation-per-election constraint.
- Separate voter participation and ballot-choice tables; the ballot table has no voter identifier, no timestamp and no shared key with participation.
- Database triggers and table-specific runtime grants make ballot/participation rows append-only through ordinary application SQL permissions.
- Public aggregate results display after an election is marked Published; staff see aggregate turnout only.
- Updated Mermaid ER diagram reflects the current schema, including email verification/reset and separated voting entities.

## Checks performed in this workspace

- `npm run check` syntax-checks backend/frontend JavaScript and checks the schema, voting separation, triggers, migration, Mermaid entities/relationships and frontend page wiring.
- Project files and SQL were statically reviewed for references to the old voter-linked `votes` table outside the one-time migration.
- HTML pages were previously checked for duplicate IDs and broken local script/style/link references; the voting-page privacy note was updated.

## Checks not performed here

- No MySQL server is available in this workspace, so the revised schema, migration, triggers and grants were not executed against a live MySQL instance.
- No live browser-to-MySQL/SMTP end-to-end workflow was run. The user must run the setup on the target PC, configure SMTP or use development console links, run `npm run check-db`, and complete the workflow in `README.md`.
- The project checker is a static consistency check; it does not prove runtime security or election correctness.

## Known limitations

- This is academic demonstration software, not certified election software or a cryptographically anonymous voting system.
- The API writes participation and ballot rows in one database transaction. A privileged database operator may correlate transaction/binary logs, server activity, timing or backups; a database owner can disable triggers or alter the schema.
- The runtime DB account can insert ballot rows because the API needs that permission; a malicious operator with access to the `.env` credentials could attempt to add extra ballots. The application UI does not expose ballot editing or individual ballot retrieval.
- Old backups, binary logs or exports may retain the pre-migration direct voter-to-choice association.
- SMS/OTP, audit logging, production-grade rate limiting and manifesto file upload are not implemented.
- BLO application access is not scoped to assigned booths because the schema has no BLO-to-booth assignment relation.
- Election status changes are allowed to the Election Officer/DBA according to the academic demo rules; there is no approval workflow or irreversible election lock.
