const { pool } = require('../config/db');

class ReportModel {
    /**
     * Get aggregate stats for a date range
     */
    static async getFinancialSummary(startDate, endDate) {
        // Total Revenue (all invoices in range)
        const [revenueRows] = await pool.query(
            'SELECT SUM(amount) as total FROM invoices WHERE created_at >= ? AND created_at <= ?',
            [startDate, endDate]
        );
        
        // Total Expenses (all expenses in range)
        const [expenseRows] = await pool.query(
            'SELECT SUM(amount) as total FROM expenses WHERE created_at >= ? AND created_at <= ?',
            [startDate, endDate]
        );
        
        const totalRevenue = revenueRows[0].total || 0;
        const totalExpenses = expenseRows[0].total || 0;
        const netProfit = totalRevenue - totalExpenses;
        
        return { totalRevenue, totalExpenses, netProfit };
    }

    /**
     * Get Trip-by-Trip Performance Breakdown
     */
    static async getTripBreakdown(startDate, endDate) {
        const [rows] = await pool.query(`
            SELECT 
                t.id, 
                t.created_at, 
                v.vehicle_number, 
                t.status,
                IFNULL((SELECT SUM(amount) FROM invoices WHERE trip_id = t.id), 0) as revenue,
                IFNULL((SELECT SUM(amount) FROM expenses WHERE trip_id = t.id), 0) as expenses
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            WHERE t.created_at >= ? AND t.created_at <= ?
            ORDER BY t.created_at DESC
        `, [startDate, endDate]);
        
        return rows.map(row => ({
            ...row,
            profit: row.revenue - row.expenses
        }));
    }
}

module.exports = ReportModel;
