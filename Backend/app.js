const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || '')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'EMS API is running' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/voters', require('./routes/voters'));
app.use('/api/parties', require('./routes/parties'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/elections', require('./routes/elections'));
app.use('/api/booths', require('./routes/booths'));
app.use('/api/votes', require('./routes/votes'));
app.use('/api/results', require('./routes/results'));

app.use((req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: err.message });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A record with the same unique value already exists.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'One of the selected related records does not exist.' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'This account has related voting records and cannot be deleted. Deactivate it instead.' });
  if (err.code === 'ER_DATA_TOO_LONG' || err.code === 'ER_TRUNCATED_WRONG_VALUE') return res.status(400).json({ error: 'One of the supplied values is too long or has an invalid format.' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error. Check the backend terminal for details.' });
});
module.exports = app;
