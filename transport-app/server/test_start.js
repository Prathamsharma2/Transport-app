const { pool } = require('./config/db');

async function testConnection() {
    console.log('--- 🧪 MySQL Connection Test ---');
    console.log('Attempting to reach Hostinger...');
    
    try {
        const connection = await pool.getConnection();
        console.log('✅ SUCCESS: Connection established!');
        console.log('Database is now working and ready for use.');
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED: Still cannot reach the database.');
        console.error('Reason:', err.message);
        
        if (err.code === 'ETIMEDOUT') {
            console.log('\n--- 🛠️ FIX THIS ---');
            console.log('1. Go to Hostinger -> Databases -> Remote MySQL');
            console.log('2. Add this exact IP: 125.18.119.194');
            console.log('3. Then run this test again.');
        } else {
            console.log('\nCheck your .env file for errors.');
        }
        process.exit(1);
    }
}

testConnection();
