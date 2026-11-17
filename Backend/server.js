require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');
const port = Number(process.env.PORT || 3000);

(async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET is missing or too short. Set a random secret of at least 32 characters in Backend/.env.');
    }
    await pool.query('SELECT 1');
    console.log('MySQL connection successful.');
    app.listen(port, '0.0.0.0', () => console.log(`EMS API listening on port ${port}`));
  } catch (err) {
    console.error('Could not start EMS API. Check Backend/.env and database/database setup.');
    console.error(err.message);
    process.exit(1);
  }
})();
