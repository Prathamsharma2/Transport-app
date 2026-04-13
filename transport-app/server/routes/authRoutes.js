const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authMiddleware, requireRole } = require('../middlewares/AuthMiddleware');

const router = express.Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Protected routes (admin only)
router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const UserModel = require('../models/UserModel');
        const users = await UserModel.getAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = router;
