const express = require('express');
const router = express.Router();
const ExpenseController = require('../controllers/ExpenseController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Expense Management
router.get('/', authMiddleware, RoleMiddleware.isStaff, ExpenseController.getAllExpenses);
router.post('/', authMiddleware, RoleMiddleware.isStaff, ExpenseController.createExpense);

module.exports = router;
