const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Super Admin: Manage all users
router.get('/', authMiddleware, RoleMiddleware.isSuperAdmin, UserController.getAllUsers);
router.post('/', authMiddleware, RoleMiddleware.isAdmin, UserController.createUser); // Admin can create drivers
router.put('/:id', authMiddleware, RoleMiddleware.isSuperAdmin, UserController.updateUser);
router.delete('/:id', authMiddleware, RoleMiddleware.isSuperAdmin, UserController.deleteUser);
router.patch('/:id/status', authMiddleware, RoleMiddleware.isSuperAdmin, UserController.toggleUserStatus);

module.exports = router;
