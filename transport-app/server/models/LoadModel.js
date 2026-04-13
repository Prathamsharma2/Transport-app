const { pool } = require('../config/db');

class LoadModel {
    /**
     * Create a new load record
     */
    static async create(loadData) {
        const { pickup, drop_location, weight, truck_type, price, consignor, consignee, status, gr, fright, payment, box, station, from_to, bal, sur, shortage } = loadData;
        const [result] = await pool.query(
            'INSERT INTO loads (pickup, drop_location, weight, truck_type, price, consignor, consignee, status, gr, fright, payment, box, station, from_to, bal, sur, shortage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [pickup, drop_location, weight, truck_type, price, consignor, consignee, status || 'PENDING', gr, fright, payment, box, station, from_to, bal, sur, shortage]
        );
        return result.insertId;
    }

    /**
     * Get all loads
     */
    static async getAll() {
        const [rows] = await pool.query('SELECT * FROM loads ORDER BY id DESC');
        return rows;
    }

    /**
     * Get load by ID
     */
    static async getById(id) {
        const [rows] = await pool.query('SELECT * FROM loads WHERE id = ?', [id]);
        return rows[0];
    }

    /**
     * Update load status
     */
    static async updateStatus(id, status) {
        await pool.query('UPDATE loads SET status = ? WHERE id = ?', [status, id]);
    }

    /**
     * Delete load
     */
    static async delete(id) {
        await pool.query('DELETE FROM loads WHERE id = ?', [id]);
    }
}

module.exports = LoadModel;
