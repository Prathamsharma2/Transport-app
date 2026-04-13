const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Admin Helper Functions
async function pushUpdate(version, notes, downloadUrl, platform) {
    try {
        const [result] = await pool.query(
            'INSERT INTO app_updates (version, release_notes, url, platform) VALUES (?, ?, ?, ?)',
            [version, notes, downloadUrl, platform]
        );
        return { success: true, id: result.insertId };
    } catch (err) {
        console.error('Push Update Error:', err);
        throw err;
    }
}

async function getUsers() {
    try {
        const [rows] = await pool.query('SELECT id, username, role FROM users ORDER BY id DESC');
        return rows;
    } catch (err) {
        console.error('Get Users Error:', err);
        throw err;
    }
}

async function deleteUser(id) {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        return { success: true };
    } catch (err) {
        console.error('Delete User Error:', err);
        throw err;
    }
}

async function createUser(username, password, role) {
    try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        return { success: true, id: result.insertId };
    } catch (err) {
        console.error('Create User Error:', err);
        throw err;
    }
}

async function getUpdateHistory() {
    try {
        const [rows] = await pool.query('SELECT * FROM app_updates ORDER BY created_at DESC LIMIT 20');
        return rows;
    } catch (err) {
        console.error('Get History Error:', err);
        throw err;
    }
}

module.exports = {
    pushUpdate,
    getUsers,
    deleteUser,
    createUser,
    getUpdateHistory
};
