require('dotenv').config();
const { pool, initSchema } = require('./db');
(async () => {
  try {
    console.log('Using DB host:', process.env.MYSQL_HOST);
    await initSchema();
    const [rows] = await pool.query('SELECT 1+1 AS res');
    console.log('Server DB OK', rows);
    await pool.end();
  } catch (e) {
    console.error('Server DB ERR', e && (e.message || e));
    process.exit(2);
  }
})();
