const { pool } = require('../config/db');

class InvoiceModel {
    /**
     * Create/generate a new invoice with full billing details
     */
    static async create(invoiceData) {
        const { 
            trip_id, amount, rate, freight, advance, 
            balance, other_charges, insurance_company, policy_no 
        } = invoiceData;

        const [result] = await pool.query(
            `INSERT INTO invoices (
                trip_id, amount, rate, freight, advance, 
                balance, other_charges, insurance_company, policy_no, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                trip_id, amount, rate || 0, freight || 0, advance || 0, 
                balance || 0, other_charges || 0, insurance_company || null, policy_no || null, 'unpaid'
            ]
        );
        return result.insertId;
    }

    /**
     * Find invoice by ID
     */
    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT i.*, t.start_location, t.end_location, d.name as driver_name, v.vehicle_number, l.truck_type as load_title
            FROM invoices i
            LEFT JOIN trips t ON i.trip_id = t.id
            LEFT JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN loads l ON t.load_id = l.id
            WHERE i.id = ?
        `, [id]);
        return rows[0];
    }

    /**
     * Update invoice status (Paid/Unpaid)
     */
    static async updateStatus(id, status) {
        const paid_at = status === 'paid' ? new Date() : null;
        await pool.query('UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?', [status, paid_at, id]);
    }

    /**
     * Get all invoices (Billing tab)
     */
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT i.*, t.status as trip_status, v.vehicle_number 
            FROM invoices i
            LEFT JOIN trips t ON i.trip_id = t.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            ORDER BY i.created_at DESC
        `);
        return rows;
    }

    /**
     * Get revenue stats for dashboard
     */
    static async getRevenueStats() {
        const [rows] = await pool.query('SELECT IFNULL(SUM(amount), 0) as total FROM invoices');
        return rows[0].total;
    }

    /**
     * Get monthly summary for reports
     */
    static async getMonthlySummary() {
        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count,
                SUM(amount) as total
            FROM invoices
            GROUP BY month
            ORDER BY month DESC
        `);
        return rows;
    }
}

module.exports = InvoiceModel;
