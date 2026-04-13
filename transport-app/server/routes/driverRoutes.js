const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/DriverController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Driver Management
router.get('/', authMiddleware, RoleMiddleware.canManageDrivers, DriverController.getAllDrivers);
router.get('/:id', authMiddleware, RoleMiddleware.canManageDrivers, DriverController.getDriverById);
router.post('/', authMiddleware, RoleMiddleware.canManageDrivers, DriverController.createDriver);
router.put('/:id', authMiddleware, RoleMiddleware.canManageDrivers, DriverController.updateDriver);
router.delete('/:id', authMiddleware, RoleMiddleware.isSuperAdmin, DriverController.deleteDriver); // Super Admin Only Override
router.patch('/:id/status', authMiddleware, RoleMiddleware.isAdmin, DriverController.toggleDriverStatus);

module.exports = router;
