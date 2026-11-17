# Electra Backend

Node.js 18+ / Express API backed by MySQL 8+. See the project-root `README.md` for the complete Windows setup and workflow.

## Quick start

```powershell
Copy-Item .env.example .env
npm install
npm run check
npm run check-db
npm start
```

Before starting the API, create the database using `database/schema.sql` (new install) or apply the documented migrations to an existing database. Then run `database/app-user-grants.sql` as a MySQL administrator and set the matching DB credentials in `.env`. Run `npm run create-admin` once to interactively create the first DBA login.

## Email configuration

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, and `APP_BASE_URL` in `.env` to send verification and password-reset emails. For local development, if SMTP host/from are blank and `NODE_ENV=development`, the one-time link is printed in the backend terminal. Console links are disabled in production. Verification tokens expire in 24 hours; reset tokens expire in one hour. The database stores token hashes, not raw tokens.

## API groups

- `/api/auth` — registration, login, email verification/resend, forgot/reset password and current user
- `/api/accounts` — DBA-only staff and account management
- `/api/voters` — voter profile operations
- `/api/parties` and `/api/candidates` — party/candidate records
- `/api/applications` — voter submission, tracking and review
- `/api/elections` — election setup, status and candidate assignment
- `/api/booths` — booth lookup and administration
- `/api/votes` — voter eligibility and ballot submission
- `/api/results` — public aggregate results after publication; staff aggregate turnout

Protected routes require `Authorization: Bearer <token>`.

## GitHub Pages / remote frontend deployment

The API can serve a frontend hosted separately (including GitHub Pages), but the browser must be configured with the backend public HTTPS URL. Update `Frontend/js/config.js` so `API_BASE_URL` points to `https://YOUR_API_HOST/api`; never use `localhost` for visitors opening the public website. Set `FRONTEND_ORIGINS` in the backend `.env` to the exact GitHub Pages origin (for example, `https://YOUR_GITHUB_NAME.github.io`) and set `NODE_ENV=production`. Keep MySQL private; expose only the API over HTTPS through a properly secured host or tunnel. The backend and database must remain online for remote users. See the root `README.md` for the full Windows, GitHub Pages, CORS, and HTTPS-tunnel setup.

## Ballot/participation separation

- `voter_participation` records `(election_id, voter_id)` only and enforces one participation per voter/election.
- `ballots` records a random UUID, `election_id` and `candidate_id`; it contains no voter or participation identifier and no timestamp.
- There is no FK or shared ID between those tables. The ballot table references the assigned `(election_id, candidate_id)` pair.
- The API writes both rows in one transaction. Results aggregate `ballots`; staff turnout counts `voter_participation`. No API endpoint returns an individual ballot row.
- Database triggers and the restricted `ems_user` grants prevent ordinary update/delete operations on either table.

This is a classroom-level privacy improvement, not cryptographic anonymity. A privileged database owner may correlate transaction/binary logs or server activity, disable triggers, change the schema, or insert extra rows. Old backups/logs may retain the previous voter-to-choice association. Do not use for real elections.

## Notes

- Never commit `Backend/.env` or disclose database/JWT/SMTP credentials.
- The runtime DB account should not receive `UPDATE` or `DELETE` on `ballots` or `voter_participation`; use `database/app-user-grants.sql`.
- Recovery endpoints use generic responses to avoid revealing whether an email is registered. Verification and reset tokens are single-use and expire.
- SMS/OTP, audit logging, production-grade rate limiting and complete automated end-to-end tests are not included.
