const DriverModel = require('../models/DriverModel');

class DriverController {
    /**
     * Add Driver (Admin/Super Admin)
     */
    static async createDriver(req, res) {
        const { name, phone, license_no, aadhaar_no, joined_date } = req.body;
        if (!name || !phone) return res.status(400).json({ error: 'Name and Phone are required' });

        try {
            const driverId = await DriverModel.create({
                name, phone, license_no, aadhaar_no, joined_date, 
                status: 'AVAILABLE'
            });
            res.status(201).json({ message: 'Driver added', driverId });
        } catch (e) {
            console.error('--- Driver Controller Error:', e.message);
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Driver with this Phone, License, or Aadhaar number already exists.' });
            }
            res.status(500).json({ error: 'Failed to add driver: ' + e.message });
        }
    }

    /**
     * View all drivers
     */
    static async getAllDrivers(req, res) {
        try {
            const drivers = await DriverModel.getAll();
            res.json(drivers);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch drivers' });
        }
    }

    /**
     * View single driver details
     */
    static async getDriverById(req, res) {
        const { id } = req.params;
        try {
            const driver = await DriverModel.findById(id);
            if (!driver) return res.status(404).json({ error: 'Driver not found' });
            res.json(driver);
        } catch (e) {
            console.error('--- Driver Controller Error (Detail):', e.message);
            res.status(500).json({ error: 'Failed to fetch driver details' });
        }
    }

    /**
     * Edit Driver (Admin/Super Admin)
     */
    static async updateDriver(req, res) {
        const { id } = req.params;
        const { name, phone, license_no, aadhaar_no, joined_date, status } = req.body;
        try {
            const updateData = { name, phone, license_no, aadhaar_no, joined_date, status };
            // Remove undefined fields to prevent overwriting with null unless intended
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            await DriverModel.update(id, updateData);
            res.json({ message: 'Driver updated successfully' });
        } catch (e) {
            console.error(`--- Driver Update Error [ID: ${id}]:`, e.message);
            res.status(500).json({ error: 'Update failed: ' + e.message });
        }
    }

    /**
     * Delete Driver (Super Admin Only)
     */
    static async deleteDriver(req, res) {
        const { id } = req.params;
        try {
            await DriverModel.delete(id);
            res.json({ message: 'Driver deleted (Super Admin Override)' });
        } catch (e) {
            res.status(500).json({ error: 'Delete failed' });
        }
    }

    /**
     * Block/Unblock Driver
     */
    static async toggleDriverStatus(req, res) {
        const { id } = req.params;
        try {
            const newStatus = await DriverModel.toggleStatus(id);
            res.json({ message: `Driver status changed to ${newStatus}`, status: newStatus });
        } catch (e) {
            res.status(500).json({ error: 'Status toggle failed' });
        }
    }
}

module.exports = DriverController;
