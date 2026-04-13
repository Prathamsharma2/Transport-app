const ExpenseModel = require('../models/ExpenseModel');

class ExpenseController {
    /**
     * Get all expenses with detail context
     */
    static async getAllExpenses(req, res) {
        try {
            const expenses = await ExpenseModel.getAll();
            const total = await ExpenseModel.getTotal();
            const stats = await ExpenseModel.getStats();
            
            res.json({
                expenses,
                total,
                stats
            });
        } catch (e) {
            console.error('--- Expense Controller Error (List):', e.message);
            res.status(500).json({ error: 'Failed to fetch detailed expenses' });
        }
    }

    /**
     * Create an expense
     */
    static async createExpense(req, res) {
        const { trip_id, category, type, amount } = req.body;
        if (!trip_id || !amount) return res.status(400).json({ error: 'Trip and Amount are required' });
        try {
            const expenseId = await ExpenseModel.create({ trip_id, category, type, amount });
            res.status(201).json({ message: 'Expense added successfully', expenseId });
        } catch (e) {
            console.error('--- Expense Controller Error (Create):', e.id, e.message);
            res.status(500).json({ error: 'Failed to add expense: ' + e.message });
        }
    }
}

module.exports = ExpenseController;
