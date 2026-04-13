require('dotenv').config({path:'.env'});
const mysql = require('mysql2/promise');
(async () => {
  try {
    console.log('Connecting to', process.env.MYSQL_HOST, process.env.MYSQL_USER, process.env.MYSQL_DATABASE);
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT || 3306,
      connectTimeout: 10000
    });
    const [rows] = await conn.query('SELECT 1+1 AS res');
    console.log('DB OK', rows);
    await conn.end();
  } catch (e) {
    console.error('DB ERR', e && (e.message || e));
    process.exit(2);
  }
})();
