require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');
const port = Number(process.env.PORT || 3000);

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection successful.');
    app.listen(port, () => console.log(`EMS API listening on http://localhost:${port}`));
  } catch (err) {
    console.error('Could not connect to MySQL. Check Backend/.env and database/schema.sql.');
    console.error(err.message);
    process.exit(1);
  }
})();