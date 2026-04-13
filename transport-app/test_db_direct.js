const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function testConnection() {
    console.log('--- DB Connection Test ---');
    console.log('Host:', process.env.MYSQL_HOST);
    console.log('User:', process.env.MYSQL_USER);
    console.log('Database:', process.env.MYSQL_DATABASE);
    console.log('Port:', process.env.MYSQL_PORT);

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            connectTimeout: 10000
        });
        console.log('✅ SUCCESS: Connection established!');
        await connection.end();
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        console.error('Code:', err.code);
        if (err.code === 'ETIMEDOUT') {
            console.log('\nPotential reasons:');
            console.log('1. Hostinger hasn\'t applied the whitelist yet (wait 2-5 mins).');
            console.log('2. Your local network/ISP is blocking port 3306.');
            console.log('3. The Host IP in .env is incorrect (Check srv679.hstgr.io vs 82.25.121.128).');
        }
    }
}

testConnection();
