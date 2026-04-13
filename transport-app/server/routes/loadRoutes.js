const express = require('express');
const router = express.Router();
const LoadController = require('../controllers/LoadController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Load Management Routes
router.get('/', authMiddleware, RoleMiddleware.isStaff, LoadController.getAllLoads);
router.get('/:id', authMiddleware, RoleMiddleware.isStaff, LoadController.getLoadById);
router.post('/', authMiddleware, RoleMiddleware.isStaff, LoadController.createLoad);
router.delete('/:id', authMiddleware, RoleMiddleware.isAdmin, LoadController.deleteLoad); // Deleting restricted to Admin

module.exports = router;
