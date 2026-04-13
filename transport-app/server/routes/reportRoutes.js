const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Analytics & Reports
router.get('/analytics', authMiddleware, RoleMiddleware.isStaff, ReportController.getAnalytics);

module.exports = router;
