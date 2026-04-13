const { pool } = require('../config/db');

class UserModel {
    static async findByUsername(username) {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async create(userData) {
        const { username, name, email, hashed_password, role, status } = userData;
        const [result] = await pool.query(
            'INSERT INTO users (username, name, email, hashed_password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [username, name, email, hashed_password, role, status || 'ACTIVE']
        );
        return result.insertId;
    }

    static async update(id, updateData) {
        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateData);
        await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
    }

    static async getAll() {
        const [rows] = await pool.query('SELECT id, username, name, email, role, status, created_at FROM users ORDER BY id DESC');
        return rows;
    }

    static async count() {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
        return rows[0].count;
    }

    static async toggleStatus(id) {
        const user = await this.findById(id);
        if (!user) return;
        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);
        return newStatus;
    }

    static async delete(id) {
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
    }
}

module.exports = UserModel;
