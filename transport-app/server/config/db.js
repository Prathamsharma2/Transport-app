console.log('--- [DEBUG] DB Config starting ---');
const mysql = require('mysql2/promise');
require('dotenv').config();
console.log('--- [DEBUG] DB Dotenv loaded ---');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

async function initSchema() {
    let connection;
    try {
        console.log('--- 🛡️ Connecting to MySQL (Hostinger Cloud) ---');
        connection = await pool.getConnection();
        console.log('--- 🚀 Connection Successful. Initializing Schema ---');
        
        await connection.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(191) UNIQUE,
            name VARCHAR(191),
            email VARCHAR(191) UNIQUE,
            hashed_password VARCHAR(191),
            role VARCHAR(30) DEFAULT 'staff',
            status VARCHAR(50) DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS loads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pickup TEXT,
            drop_location TEXT,
            weight INT,
            truck_type VARCHAR(100),
            price INT,
            consignor VARCHAR(255) DEFAULT 'Not Assigned',
            consignee VARCHAR(255) DEFAULT 'Not Assigned',
            status VARCHAR(50) DEFAULT 'PENDING',
            gr VARCHAR(100),
            fright INT,
            payment INT,
            box VARCHAR(100),
            station VARCHAR(255),
            from_to VARCHAR(255),
            bal INT,
            sur INT,
            shortage INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS vehicles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_number VARCHAR(100),
            type VARCHAR(100),
            make VARCHAR(100),
            model VARCHAR(100),
            capacity INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS drivers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(191),
            phone VARCHAR(50),
            license_number VARCHAR(100),
            aadhaar_number VARCHAR(100),
            status VARCHAR(50) DEFAULT 'AVAILABLE',
            joined_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS trips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            load_id INT,
            vehicle_id INT,
            driver_id INT,
            start_location VARCHAR(255),
            end_location VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE SET NULL,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
            FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            trip_id INT,
            category VARCHAR(100),
            type VARCHAR(200),
            amount INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            trip_id INT,
            amount INT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP NULL,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS app_updates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            version VARCHAR(50) UNIQUE,
            url TEXT,
            platform VARCHAR(10),
            release_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        await connection.query(`CREATE TABLE IF NOT EXISTS ledger_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date VARCHAR(50),
            truck_no VARCHAR(100),
            station VARCHAR(150),
            gr VARCHAR(100),
            weight VARCHAR(100),
            fright VARCHAR(100),
            payment VARCHAR(100),
            box VARCHAR(100),
            from_to VARCHAR(150),
            bal VARCHAR(100),
            sur VARCHAR(100),
            shortage VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);

        console.log('--- ✅ Database Fully Synchronized ---');
    } catch (err) {
        console.error('--- 🚨 DATABASE CONNECTION FAILED 🚨 ---');
        console.error('ERROR:', err.message);
        
        if (err.code === 'ETIMEDOUT') {
            console.error('!!! FIREWALL ALERT !!!');
            console.error('Action Required: You MUST whitelist your IP in Hostinger Panel.');
            console.error('Your IP: 125.18.119.194');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('!!! ACCESS DENIED !!!');
            console.error('Check your Username and Password in .env');
        }
        console.warn('--- ⚠️ Hostinger MySQL Failed, but proceeding because Supabase is active ---');
    } finally {
        if (connection) connection.release();
    }
}

module.exports = { pool, initSchema };
