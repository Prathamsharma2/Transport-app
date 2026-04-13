const { pool } = require('../config/db');

class NotificationModel {
    /**
     * Create a new notification
     * @param {Object} data { title, message }
     * @returns {Promise<number>} ID of the created notification
     */
    static async create(data) {
        const { title, message } = data;
        const [result] = await pool.query(
            'INSERT INTO notifications (title, message) VALUES (?, ?)',
            [title, message]
        );
        return result.insertId;
    }

    /**
     * Get all notifications ordered by newest first
     * @returns {Promise<Array>} List of notifications
     */
    static async getAll() {
        const [rows] = await pool.query(
            'SELECT * FROM notifications ORDER BY created_at DESC'
        );
        return rows;
    }
}

module.exports = NotificationModel;
