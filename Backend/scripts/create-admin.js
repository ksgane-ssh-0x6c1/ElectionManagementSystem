require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
const askPassword = () => new Promise((resolve) => {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    const fallback = readline.createInterface({ input: process.stdin, output: process.stdout });
    fallback.question('Password (input may be visible): ', (answer) => { fallback.close(); resolve(answer); });
    return;
  }
  process.stdout.write('Password (hidden): ');
  const stdin = process.stdin;
  let input = '';
  const finish = () => {
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener('data', onData);
    process.stdout.write('\n');
    resolve(input);
  };
  const onData = (chunk) => {
    const key = chunk.toString();
    if (key === '\u0003') { process.stdout.write('\n'); process.exit(130); }
    if (key === '\r' || key === '\n') return finish();
    if (key === '\u0008' || key === '\u007f') input = input.slice(0, -1);
    else if (key >= ' ' && key <= '~') input += key;
  };
  stdin.setRawMode(true);
  stdin.resume();
  stdin.on('data', onData);
});

(async () => {
  try {
    console.log('\nElectra first administrator setup');
    console.log('This creates one DBA account. Do not share these credentials.\n');
    const fullName = (await ask('Full name: ')).trim();
    const username = (await ask('Username (4–40 letters/numbers/_): ')).trim();
    const email = (await ask('Email: ')).trim().toLowerCase();
    rl.close();
    const password = await askPassword();
    if (!fullName || !/^[A-Za-z0-9_]{4,40}$/.test(username) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      throw new Error('Invalid input. Review the name, username, email, and password requirements.');
    }
    const [existing] = await db.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length) throw new Error('That username or email already exists.');
    const hash = await bcrypt.hash(password, 12);
    await db.execute('INSERT INTO users (role, full_name, username, email, password_hash, email_verified, email_verified_at) VALUES (?,?,?,?,?,TRUE,UTC_TIMESTAMP())', ['DBA', fullName, username, email, hash]);
    console.log('\nDBA account created. Sign in using the DBA role.');
  } catch (err) {
    console.error('\nAdministrator setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await db.end();
  }
})();
