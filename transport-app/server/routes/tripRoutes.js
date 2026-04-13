const express = require('express');
const router = express.Router();
const TripController = require('../controllers/TripController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');

// Trip Management
router.get('/', authMiddleware, RoleMiddleware.isStaff, TripController.getAllTrips); // Staff/Admin can see all
router.get('/:id', authMiddleware, RoleMiddleware.isStaff, TripController.getTripById); // Trip Summary Detail
router.get('/assigned', authMiddleware, RoleMiddleware.isDriver, TripController.getDriverTrips); // Drivers see their own
router.post('/', authMiddleware, RoleMiddleware.isStaff, TripController.createTrip); // Staff can create
router.patch('/:id', authMiddleware, RoleMiddleware.isDriver, TripController.updateTrip); // Drivers can update their assigned trips
router.patch('/:id/complete', authMiddleware, RoleMiddleware.isStaff, TripController.completeTrip); // Staff can finalize
router.delete('/:id', authMiddleware, RoleMiddleware.isSuperAdmin, TripController.deleteTrip); // Super Admin delete override

module.exports = router;
