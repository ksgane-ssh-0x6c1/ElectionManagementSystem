# EMS Backend

Academic project backend using Node.js, Express, and MySQL.

## 1. Requirements
- Node.js 18 or later
- MySQL 8 or compatible version

## 2. Setup
1. Open a terminal in `Backend/`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and enter your MySQL credentials.
4. Run `database/schema.sql` in MySQL Workbench (it creates `ems_db`).
5. Optionally run `database/seed.sql` for a sample booth.
6. Run `npm run dev` or `npm start`.
7. Check `http://localhost:3000/api/health`.

## 3. Main endpoints
- `POST /api/auth/register` — public registration for Voter, Party, Candidate
- `POST /api/auth/login` — returns a bearer token
- `GET /api/auth/me` — current user
- `/api/accounts` — authorized account listing/status/deletion
- `/api/voters` — voter profile operations
- `/api/parties`, `/api/candidates` — party and candidate data
- `/api/applications` — voter application submission/review/tracking
- `/api/elections` — election management and candidate assignment
- `/api/booths` — polling booth lookup/management
- `POST /api/votes` — submit a vote
- `GET /api/results/:electionId` — results after publication

For protected endpoints send `Authorization: Bearer YOUR_TOKEN`.

## 4. Important notes
- This is an educational starting point, not a production election system.
- The simple vote table links voter and election to enforce one vote per election. A real secret-ballot system needs a different architecture that separates voter eligibility from ballot contents.
- Create the first Election Officer/DBA through a controlled local setup process. Do not make privileged roles publicly self-registerable.
- Password reset, email verification, audit logs, rate limiting, stronger input validation, and comprehensive tests are not implemented yet.
- The supplied frontend is still a demo and its JavaScript forms must be connected to these endpoints.
