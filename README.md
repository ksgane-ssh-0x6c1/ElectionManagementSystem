# Electra — Election Management System (Academic DBMS Project)

Electra is an academic demonstration built with HTML, CSS, browser JavaScript, Node.js/Express and MySQL. It includes registration and login, email verification and password reset, voter applications, booth lookup, staff review, party/candidate profiles, election setup, voting eligibility, ballot submission and published results.

> **Academic-use warning:** Electra is not certified election software and must not be used for a real public election or real voter data. The voting database has been improved to separate voter participation from ballot choices, but it does not provide cryptographic anonymity, end-to-end verifiability, coercion resistance, or protection against a malicious database owner or compromised server.

## 1. Requirements for Windows

- Windows 10/11
- Node.js 18 or later
- MySQL 8 or a compatible MySQL server
- MySQL Workbench (recommended for running SQL scripts)
- VS Code with Live Server (recommended) or another local static web server

## 2. Create or upgrade the MySQL database

### New installation

1. Start the MySQL Server service.
2. Open MySQL Workbench and connect to your local MySQL server.
3. Open and execute `Backend/database/schema.sql`. It creates `ems_db` and all current tables, including email-verification, password-reset, voter-participation and ballot tables.
4. Optionally execute `Backend/database/seed.sql` to insert the sample booth `BTH-001`.
5. Open `Backend/database/app-user-grants.sql`. Replace `CHANGE_THIS_TO_A_STRONG_PASSWORD` with a strong password, then execute the script as a MySQL administrator. Use the same password for `DB_PASSWORD` in `Backend/.env`.

### Upgrade an existing Electra database

Back up the database before running any migration.

- If the database already has `email_verified`, `email_verified_at`, `email_verification_tokens` and `password_reset_tokens` from the previous email-enabled Electra package, run `Backend/database/migrations/002_separate_ballots_from_voter_identity.sql` once.
- If it does not yet have the email-verification changes, run `001_email_verification_and_password_reset.sql` first, then run `002_separate_ballots_from_voter_identity.sql` once.
- Do not run either migration on a fresh database created from the current `schema.sql`.
- After migration, run `app-user-grants.sql` as described above. If the existing `ems_user` already has the older database-wide `ALL PRIVILEGES` grant, uncomment the two `REVOKE` lines in that script before running it so the broad grant is removed and replaced with table-specific permissions.

**Important about historical votes:** Before this update, the old `votes` table stored `voter_id` and `candidate_id` together. The migration copies participation and candidate totals into separate tables and drops that old table, but it cannot erase old database backups, exports, binary logs, screenshots or other copies. Historical votes should not be described as retroactively anonymous.

### Database layout after the update

- `voter_participation` stores only `election_id` and `voter_id`. Its composite primary key prevents the same voter from recording participation twice in one election.
- `ballots` stores a random UUID, `election_id` and `candidate_id`. It has no `voter_id`, `user_id`, participation ID or timestamp.
- There is no foreign key or shared identifier between `voter_participation` and `ballots`.
- `ballots` references the `(election_id, candidate_id)` pair in `election_candidates`, so a ballot can only select a candidate assigned to that election.
- Database triggers reject ordinary updates/deletes to participation and ballot rows, and reject ballot inserts when the election is not open or its date has not arrived.
- The application DB account receives `SELECT` and `INSERT` on `voter_participation` and `ballots`, but not `UPDATE` or `DELETE` on those two tables. Other tables receive the permissions needed by the application.

This design removes the direct relational voter-to-choice link from the current schema and from the normal Electra admin API. It is a coursework-level privacy improvement, **not** a guarantee against a privileged database owner. The backend writes the participation and ballot rows in one transaction; a privileged operator with access to transaction/binary logs, server memory, backups or timing information may still correlate activity. A database owner can also disable triggers or change the schema. Do not treat this as a real secret-ballot system.

## 3. Configure and start the backend

Open PowerShell in the `Backend` folder and create the environment file:

```powershell
Copy-Item .env.example .env
```

Edit `Backend/.env` and set:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=ems_user
DB_PASSWORD=THE_SAME_PASSWORD_USED_IN_app-user-grants.sql
DB_NAME=ems_db
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG
```

Replace `JWT_SECRET` with a long random value (at least 32 characters). Keep `DB_USER` and `DB_PASSWORD` consistent with the MySQL user and grant script. The `.env` file is ignored by Git and must never be uploaded or shared.

### Configure email verification and password reset

To send real email, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` in `Backend/.env`. For Gmail, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false`, and a Google App Password (not your normal Gmail password). Set `APP_BASE_URL` to the frontend pages URL, for example `http://127.0.0.1:5500/pages`.

For local testing without SMTP, leave `SMTP_HOST` and `MAIL_FROM` blank. In development mode Electra prints the one-time verification/reset link in the backend terminal; open that link in your browser. This console-link mode is disabled when `NODE_ENV=production`. Verification links expire after 24 hours; password-reset links expire after 1 hour. Tokens are random, stored only as SHA-256 hashes and invalidated after use.

Then run:

```powershell
npm install
npm run check
npm run check-db
npm start
```

The project check verifies JavaScript syntax and key schema/diagram consistency. `check-db` checks that the configured MySQL account can connect and read the database version. Leave this terminal running. Open `http://localhost:3000/api/health`; the response should contain `"status":"ok"`.

## 4. Create the first DBA account

Public self-registration is deliberately restricted to Voter, Party and Candidate accounts. After the backend and database are running, open a second PowerShell window in `Backend` and run:

```powershell
npm run create-admin
```

Follow the prompts to create the first DBA account. The password is hidden in an interactive terminal. This account can create BLO and Election Officer accounts in Account Management. Do not publish the DBA login or password.

## 5. Open the frontend

In VS Code, open the `Frontend` folder and start Live Server on `Frontend/pages/index.html` (usually `http://127.0.0.1:5500/pages/index.html`). The local API URL is in `Frontend/js/config.js`:

```js
window.EMS_CONFIG = Object.freeze({ API_BASE_URL: 'http://localhost:3000/api' });
```

Keep that value for local use on the same PC. For a public deployment, replace it with your deployed HTTPS API URL and configure the backend's `FRONTEND_ORIGINS`. A visitor's `localhost` refers to the visitor's own computer, not the PC running your MySQL database.

## 6. Main workflow for a demonstration

1. Create the DBA account using `npm run create-admin`.
2. Sign in as DBA and create an Election Officer and a BLO account in Account Management.
3. Create a Voter, Party and Candidate account using public registration, then verify their email addresses.
4. The voter submits an application. The BLO or Election Officer reviews it and saves Approved / Rejected / Needs Information.
5. The Election Officer creates an election and assigns candidates (and optionally a booth).
6. A voter with an Approved application can cast one ballot in an election whose status is Open and whose date has arrived.
7. The Election Officer changes the election status to Published. Public results show candidate-level totals, not individual ballot records.

The API enforces roles and voting checks on the server; hiding a button in the frontend is not used as the security boundary.

## 7. What is and is not implemented

Implemented in this package:
- Password-hashed account creation and login with JWT authentication; new accounts require email verification
- Role-protected dashboards and API routes
- Voter profile updates and voter applications
- Booth lookup from the database
- BLO / Election Officer application review
- Party and candidate profiles; party candidate registration
- Election creation, status changes and candidate assignment
- Voter eligibility checks and one-participation-per-election database constraint
- Separate voter-participation and ballot-choice tables, with random ballot IDs and append-only database triggers
- Aggregate published results and aggregate staff turnout summaries
- DBA account/staff management
- MySQL connectivity check and interactive first-DBA setup
- Email verification, resend-verification flow, forgot-password email and one-time password reset

Not implemented / not verified:
- SMS/OTP, audit logging and production-grade rate limiting
- File upload for party manifestos
- Automated end-to-end browser tests
- Cryptographic secret-ballot guarantees, end-to-end verifiability, independent auditing or official election certification
- A live SMTP delivery and MySQL verification on your specific PC. Configure SMTP (or use development console links), complete the setup steps above and run `npm run check-db` locally.

## 8. Local PC database vs online hosting

The simplest setup for coursework is to run MySQL, the Node backend and the frontend on the same PC. MySQL stores the database locally on that PC.

If you publish the frontend on GitHub Pages, GitHub Pages only hosts static files. You still need an always-reachable backend and database for other people to use the app. A visitor cannot connect to your PC's `localhost`. Do not expose MySQL port 3306 directly to the public internet. For public access, use a cloud-hosted backend and a private/managed database connection or a properly secured private network.

## 9. Troubleshooting

- **`ECONNREFUSED 127.0.0.1:3306`:** MySQL Server is not running, or `DB_HOST` / `DB_PORT` is incorrect.
- **`Access denied for user`:** verify `DB_USER`, `DB_PASSWORD`, the matching MySQL host entry and table-specific grants.
- **`UPDATE command denied` or `DELETE command denied` on ballots/participation:** this is intentional; those records are append-only. Recreate a fresh demo database if you need to reset test voting data.
- **Cannot reach API:** make sure `npm start` is still running and `API_BASE_URL` points to `http://localhost:3000/api`.
- **CORS error:** when using a different frontend origin, add that exact origin to `FRONTEND_ORIGINS` in `Backend/.env`, restart the backend and do not use a wildcard in a public deployment.
- **Login invalid:** choose the exact role assigned to that account. BLO, Election Officer and DBA accounts are provisioned by an administrator.


## 10. Publish the frontend on GitHub Pages

GitHub Pages serves static files only. It cannot run Node.js/Express or MySQL. Electra therefore uses this split deployment:

- **Frontend:** GitHub Pages (public website).
- **Backend + database:** your Windows PC (or another always-on server).
- **Connection:** the frontend calls the backend's public HTTPS address. Never point a GitHub Pages visitor to `localhost`; that would refer to the visitor's own device.

### Publish

1. Push this repository to GitHub. Keep `Backend/.env` out of Git; it is ignored.
2. In GitHub, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The included `.github/workflows/pages.yml` publishes only the `Frontend/` folder whenever you push to `main` or `master`.
4. Wait for the Pages workflow to finish. Your site will be at `https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/` (for a user site, the repository path may be absent).

### Point the website to your backend

Edit `Frontend/js/config.js` before pushing:

```js
window.EMS_CONFIG = Object.freeze({
  API_BASE_URL: 'https://YOUR_PUBLIC_BACKEND_HOST/api'
});
```

Use the real HTTPS URL assigned to your backend/tunnel, with `/api` at the end and no trailing slash after `api`. Commit and push this change. The backend must allow the exact GitHub Pages origin, for example:

```env
FRONTEND_ORIGINS=https://YOUR_GITHUB_NAME.github.io
```

For a custom domain, add its exact origin too, separated by commas. Do not include a page path or trailing slash in an origin. CORS is restricted to the configured origins in production.

## 11. Host the backend and MySQL on your own Windows PC

This option makes the GitHub Pages site usable by other people while your PC is running. Your PC must remain powered on, connected to the internet, and running both MySQL and the Node backend for the whole election. If it sleeps, shuts down, loses internet, or the tunnel stops, the website cannot submit or retrieve data. A public HTTPS tunnel is required; simply opening `localhost:3000` or forwarding a router port is not enough.

### Keep MySQL private

1. Install MySQL 8 and complete the database steps in section 2.
2. Keep MySQL bound to `127.0.0.1` and do not expose port `3306` to the internet.
3. Use the restricted `ems_user` database account created by `app-user-grants.sql`, not the MySQL root account, in `Backend/.env`.

### Configure the API for the public frontend

In `Backend/.env`, set the values below (keep the database credentials and strong JWT secret from section 3):

```env
NODE_ENV=production
PORT=3000
FRONTEND_ORIGINS=https://YOUR_GITHUB_NAME.github.io
APP_BASE_URL=https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/pages
```

Configure SMTP as described in section 3. Production email verification and password recovery require a working SMTP account; the backend intentionally does not print account links to logs in production. Ensure the email provider allows the sender address you configure.

### Expose only the backend over HTTPS

One option is Cloudflare Tunnel:

1. Install `cloudflared` on the Windows PC and sign in to Cloudflare.
2. In Cloudflare Zero Trust, create a named tunnel and add a public hostname such as `api.example.com` that forwards to `http://localhost:3000`.
3. Start the tunnel as a Windows service (or run it in a dedicated terminal for a test). Use the assigned hostname in `Frontend/js/config.js` and set `FRONTEND_ORIGINS` to your GitHub Pages origin.
4. Check `https://api.example.com/api/health`. It should return a JSON status response. Then open the GitHub Pages site and test registration/login.

A temporary tunnel URL can change when restarted; a named hostname is preferable for an election. Do not publish the database port. Use HTTPS only for the public API.

### Start and operate

Open PowerShell in `Backend`:

```powershell
npm install
npm run check
npm run check-db
npm start
```

Run `npm run create-admin` once in a second PowerShell window to create the first DBA account. Keep the backend and tunnel running. Make a database backup before the election and after it, and protect backups and credentials. Do not commit `.env`, SMTP credentials, database passwords, or JWT secrets.

### Local-only alternative

For a classroom demonstration on one PC, keep `Frontend/js/config.js` at `http://localhost:3000/api`, start MySQL and the backend, then serve `Frontend/` with VS Code Live Server. The public GitHub Pages deployment and local-only configuration are alternatives: use the public HTTPS API URL in the committed config when remote voters will use the Pages site.

## 12. Verification checklist and limitations

- [ ] `npm run check` passes.
- [ ] `npm run check-db` succeeds using the restricted database account.
- [ ] `GET /api/health` responds over the public HTTPS hostname.
- [ ] Registration, email verification, login, role dashboards and password reset work from the deployed Pages URL.
- [ ] An approved voter can vote once; a second attempt is rejected.
- [ ] Results remain hidden until publication and then show aggregate totals.
- [ ] Test with separate accounts and browsers before the demonstration.

The repository's checker is a static syntax/consistency check; it is not a full integration or security test. No live MySQL, SMTP, public tunnel, GitHub Pages or browser end-to-end test can be completed from this package-editing environment. This remains an academic demonstration, not certified election infrastructure. Do not use it for legally binding, public, political, high-stakes or real-world elections. The current privacy model is not cryptographic anonymity, and the package still lacks production-grade rate limiting, independent security review, end-to-end verifiability, coercion resistance and a formal audit trail.
