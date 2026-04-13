const express = require('express');
const router = express.Router();
const UpdateController = require('../controllers/UpdateController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Check for updates (Public)
router.get('/check', UpdateController.checkUpdate);

// Post new update (Admin Only)
router.post('/post', authMiddleware, RoleMiddleware.isAdmin, UpdateController.postUpdate);

module.exports = router;
