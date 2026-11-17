const crypto = require('crypto');

const TOKEN_TYPES = Object.freeze({
  verify: { table: 'email_verification_tokens', lifetime: '24 HOUR' },
  reset: { table: 'password_reset_tokens', lifetime: '1 HOUR' }
});

function tokenConfig(type) {
  const config = TOKEN_TYPES[type];
  if (!config) throw new Error('Unsupported account token type.');
  return config;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueToken(executor, type, userId) {
  const config = tokenConfig(type);
  const token = crypto.randomBytes(32).toString('hex');
  await executor.execute(`DELETE FROM ${config.table} WHERE user_id = ?`, [userId]);
  await executor.execute(
    `INSERT INTO ${config.table} (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${config.lifetime}))`,
    [userId, hashToken(token)]
  );
  return token;
}

async function findValidToken(executor, type, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return null;
  const config = tokenConfig(type);
  const [rows] = await executor.execute(
    `SELECT id, user_id FROM ${config.table} WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1`,
    [hashToken(token)]
  );
  return rows[0] || null;
}

async function deleteToken(executor, type, tokenId) {
  const config = tokenConfig(type);
  await executor.execute(`DELETE FROM ${config.table} WHERE id = ?`, [tokenId]);
}

module.exports = { issueToken, findValidToken, deleteToken };
