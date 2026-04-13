const TripModel = require('../models/TripModel');

class TripController {
    /**
     * Super Admin/Admin: Create and assign a trip
     */
    static async createTrip(req, res) {
        const { load_id, vehicle_id, driver_id, start_location, end_location } = req.body;
        const created_by = req.user.id;

        if (!load_id || !vehicle_id || !driver_id) {
            return res.status(400).json({ error: 'Load, Vehicle and Driver are required to create a trip' });
        }

        try {
            const tripId = await TripModel.create({
                load_id, vehicle_id, driver_id, 
                start_location, end_location, 
                status: 'pending', 
                created_by
            });
            res.status(201).json({ message: 'Trip created and assigned successfully', tripId });
        } catch (e) {
            console.error('--- Trip Controller Error:', e.message);
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This Trip already exists.' });
            }
            res.status(500).json({ error: 'Trip creation failed: ' + e.message });
        }
    }

    /**
     * Super Admin/Admin: View all trips (with filters)
     */
    static async getAllTrips(req, res) {
        try {
            const trips = await TripModel.getAll();
            res.json(trips);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch trips' });
        }
    }

    /**
     * View single trip summary (Deep Data)
     */
    static async getTripById(req, res) {
        const { id } = req.params;
        try {
            const trip = await TripModel.findById(id);
            if (!trip) return res.status(404).json({ error: 'Trip not found' });
            res.json(trip);
        } catch (e) {
            console.error('--- Trip Controller Error (Detail):', e.message);
            res.status(500).json({ error: 'Failed to fetch trip details' });
        }
    }

    /**
     * Driver: View assigned trips only
     */
    static async getDriverTrips(req, res) {
        const driver_id = req.user.id;
        try {
            const trips = await TripModel.getByDriverId(driver_id);
            res.json(trips);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch your trips' });
        }
    }

    /**
     * Super Admin/Admin: Update any trip data
     * Driver: Update status only
     */
    static async updateTrip(req, res) {
        const { id } = req.params;
        const { status, driver_id, vehicle_id, start_location, end_location } = req.body;
        const userRole = req.user.role;

        try {
            const currentTrip = await TripModel.findById(id);
            if (!currentTrip) return res.status(404).json({ error: 'Trip not found' });

            let updateData = {};

            if (userRole === 'driver') {
                // Driver can only update status and only for their own trip
                if (currentTrip.driver_id !== req.user.id) {
                    return res.status(403).json({ error: 'You can only update your own assigned trips' });
                }
                updateData = { status };
            } else {
                // Super Admin / Admin can update everything
                updateData = { status, driver_id, vehicle_id, start_location, end_location };
                // Remove undefined
                Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
            }

            await TripModel.update(id, updateData);
            res.json({ message: 'Trip updated successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Trip update failed' });
        }
    }

    /**
     * Mark Trip as Completed
     */
    static async completeTrip(req, res) {
        const { id } = req.params;
        try {
            await TripModel.update(id, { status: 'completed', updated_at: new Date() });
            res.json({ message: 'Trip marked as COMPLETED' });
        } catch (e) {
            res.status(500).json({ error: 'Failed to complete trip' });
        }
    }

    /**
     * Super Admin Override: Delete ANY trip (even if active)
     */
    static async deleteTrip(req, res) {
        const { id } = req.params;
        try {
            // Super Admin can override everything
            await TripModel.delete(id);
            res.json({ message: 'Trip deleted successfully (Super Admin Override)' });
        } catch (e) {
            res.status(500).json({ error: 'Trip deletion failed' });
        }
    }
}

module.exports = TripController;
