const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
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
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});
module.exports = app;