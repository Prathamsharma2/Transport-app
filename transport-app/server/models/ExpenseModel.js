const { pool } = require('../config/db');

class ExpenseModel {
    /**
     * Create a new expense record
     */
    static async create(expenseData) {
        const { trip_id, category, type, amount } = expenseData;
        const [result] = await pool.query(
            'INSERT INTO expenses (trip_id, category, type, amount) VALUES (?, ?, ?, ?)',
            [trip_id, category || 'General', type || 'Others', amount]
        );
        return result.insertId;
    }

    /**
     * Get all expenses with trip/vehicle details
     */
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT 
                e.*, 
                v.vehicle_number, 
                t.start_location, 
                t.end_location,
                l.truck_type as load_title
            FROM expenses e
            LEFT JOIN trips t ON e.trip_id = t.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN loads l ON t.load_id = l.id
            ORDER BY e.created_at DESC
        `);
        return rows;
    }

    /**
     * Get financial stats by category
     */
    static async getStats() {
        const [rows] = await pool.query(`
            SELECT 
                category, 
                SUM(amount) as total 
            FROM expenses 
            GROUP BY category
        `);
        return rows;
    }

    /**
     * Get total expenses summary
     */
    static async getTotal() {
        const [rows] = await pool.query('SELECT IFNULL(SUM(amount), 0) as total FROM expenses');
        return rows[0].total;
    }
}

module.exports = ExpenseModel;
