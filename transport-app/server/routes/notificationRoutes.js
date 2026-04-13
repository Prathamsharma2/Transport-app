const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// POST /api/notifications -> Only Super Admin can send updates
// RoleMiddleware.isSuperAdmin checks for 'superadmin' role internally
router.post('/', authMiddleware, RoleMiddleware.isSuperAdmin, NotificationController.sendUpdate);

// GET /api/notifications -> Admin can view them
// RoleMiddleware.isAdmin usually allows 'admin' and 'superadmin'
router.get('/', authMiddleware, RoleMiddleware.isAdmin, NotificationController.getUpdates);

module.exports = router;
