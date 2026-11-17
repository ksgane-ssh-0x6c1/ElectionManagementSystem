const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../..');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ['node_modules', '.git'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const jsFiles = [...walk(path.join(root, 'Backend')), ...walk(path.join(root, 'Frontend/js'))].filter((file) => file.endsWith('.js'));
for (const file of jsFiles) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });

const schema = fs.readFileSync(path.join(root, 'Backend/database/schema.sql'), 'utf8');
const requiredTables = ['users', 'booths', 'voters', 'parties', 'candidates', 'elections', 'election_candidates', 'voter_applications', 'voter_participation', 'ballots', 'email_verification_tokens', 'password_reset_tokens'];
const missing = requiredTables.filter((table) => !new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\(`, 'i').test(schema));
if (missing.length) throw new Error(`Missing database tables: ${missing.join(', ')}`);
if (/CREATE TABLE IF NOT EXISTS votes\s*\(/i.test(schema)) throw new Error('Legacy voter-linked votes table must not be present in the new schema.');
if (!/'DBA'/.test(schema) || !/'Election Officer'/.test(schema) || !/'BLO'/.test(schema)) throw new Error('Required staff roles are missing from the users table.');
if (!/email_verified BOOLEAN NOT NULL DEFAULT FALSE/i.test(schema) || !/email_verified_at DATETIME/i.test(schema)) throw new Error('Email verification columns are missing from the users table.');
if (!(/UNIQUE KEY\s+uq_one_participation_per_election\s*\(election_id,\s*voter_id\)/i.test(schema) || /PRIMARY KEY\s*\(election_id,\s*voter_id\)/i.test(schema))) throw new Error('One-participation-per-election unique constraint is missing.');
const ballotBlock = schema.match(/CREATE TABLE IF NOT EXISTS ballots\s*\(([\s\S]*?)\n\);/i)?.[1] || '';
if (!ballotBlock || /\b(voter_id|user_id|participation_id)\b/i.test(ballotBlock)) throw new Error('Ballots must not contain a voter or participation identifier.');
if (!/BEFORE INSERT ON ballots/i.test(schema) || !/BEFORE UPDATE ON ballots/i.test(schema) || !/BEFORE DELETE ON ballots/i.test(schema)) throw new Error('Ballot validation/append-only triggers are missing.');
for (const type of ['New Registration', 'Update Details', 'Address Change', 'Replacement']) {
  if (!schema.includes(`'${type}'`)) throw new Error(`Application type missing from schema: ${type}`);
}

const voteRoute = fs.readFileSync(path.join(root, 'Backend/routes/votes.js'), 'utf8');
if (!voteRoute.includes('voter_participation') || !voteRoute.includes('INSERT INTO ballots') || !voteRoute.includes('crypto.randomUUID')) throw new Error('Voting route does not write separated participation and UUID ballot records.');
if (/INSERT INTO votes|FROM votes/i.test(voteRoute)) throw new Error('Voting route still references the legacy votes table.');
const resultsRoute = fs.readFileSync(path.join(root, 'Backend/routes/results.js'), 'utf8');
if (!resultsRoute.includes('JOIN ballots') || !resultsRoute.includes('voter_participation')) throw new Error('Results/turnout routes do not use the separated tables.')
if (/JOIN votes|FROM votes/i.test(resultsRoute)) throw new Error('Results route still references the legacy votes table.');

const mermaid = fs.readFileSync(path.join(root, 'E-R_Diagram.mermaid'), 'utf8');
const mermaidDiagram = mermaid.split(/\r?\n/).filter((line) => !line.trim().startsWith('%%')).join('\n');
for (const entity of ['VOTER_PARTICIPATION', 'BALLOTS', 'EMAIL_VERIFICATION_TOKENS', 'PASSWORD_RESET_TOKENS']) {
  if (!new RegExp(`^\\s*${entity}\\s*\\{`, 'm').test(mermaid)) throw new Error(`Mermaid ER diagram is missing ${entity}.`);
}
if (/^\s*VOTES\s*\{/m.test(mermaidDiagram) || /VOTER_PARTICIPATION\s*[^\n]*BALLOTS|VOTERS\s*[^\n]*BALLOTS/.test(mermaidDiagram)) throw new Error('Mermaid diagram must not link voter participation directly to ballot choices.');
if (!/ELECTION_CANDIDATES \|\|--o\{ BALLOTS/.test(mermaid)) throw new Error('Mermaid diagram is missing the assigned-candidate-to-ballot relationship.');

const requiredPages = ['login.html', 'register.html', 'verify-email.html', 'forgot-password.html', 'reset-password.html', 'voter.html', 'party.html', 'candidate.html', 'blo.html', 'election-officer.html', 'account.html', 'results.html'];
for (const page of requiredPages) {
  const file = path.join(root, 'Frontend/pages', page);
  if (!fs.existsSync(file)) throw new Error(`Missing frontend page: ${page}`);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('../js/config.js') || !html.includes('../js/api.js')) throw new Error(`API scripts are not wired in frontend page: ${page}`);
  const recoveryPages = ['verify-email.html', 'forgot-password.html', 'reset-password.html'];
  if (recoveryPages.includes(page) && !html.includes('../js/account-recovery.js')) throw new Error(`Account-recovery script is not wired in frontend page: ${page}`);
  if (!recoveryPages.includes(page) && !html.includes('../js/auth.js')) throw new Error(`Authentication script is not wired in frontend page: ${page}`);
}
const authRoutes = fs.readFileSync(path.join(root, 'Backend/routes/auth.js'), 'utf8');
for (const route of ["'/verify-email'", "'/resend-verification'", "'/forgot-password'", "'/reset-password'"]) {
  if (!authRoutes.includes(route)) throw new Error(`Missing account security route: ${route}`);
}
for (const file of [
  'Backend/services/account-tokens.js', 'Backend/services/mailer.js',
  'Frontend/js/account-recovery.js',
  'Backend/database/migrations/001_email_verification_and_password_reset.sql',
  'Backend/database/migrations/002_separate_ballots_from_voter_identity.sql',
  'Backend/database/app-user-grants.sql'
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing account security / ballot privacy component: ${file}`);
}
console.log(`Project checks passed: ${jsFiles.length} JavaScript files parse, ${requiredTables.length} schema tables, ${requiredPages.length} API-enabled pages, separated ballot/participation model, and account verification/reset components are present.`);
