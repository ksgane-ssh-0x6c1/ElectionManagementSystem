require('dotenv').config();
const pool = require('../config/db');
(async () => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS databaseName, VERSION() AS mysqlVersion');
    console.log('MySQL connection successful:', rows[0]);
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
