const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/InvoiceController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Billing & Invoices
router.get('/', authMiddleware, RoleMiddleware.isStaff, InvoiceController.getAllInvoices);
router.get('/:id', authMiddleware, RoleMiddleware.isStaff, InvoiceController.getInvoiceById);
router.post('/', authMiddleware, RoleMiddleware.isStaff, InvoiceController.createInvoice);
router.patch('/:id/status', authMiddleware, RoleMiddleware.isStaff, InvoiceController.updateInvoiceStatus);
router.get('/summary', authMiddleware, RoleMiddleware.isStaff, InvoiceController.getMonthlySummary);

module.exports = router;
