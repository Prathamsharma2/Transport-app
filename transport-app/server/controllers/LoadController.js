const LoadModel = require('../models/LoadModel');

class LoadController {
    /**
     * Get all loads
     */
    static async getAllLoads(req, res) {
        try {
            const loads = await LoadModel.getAll();
            res.json(loads);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch loads' });
        }
    }

    /**
     * Get load by ID (For Details Modal)
     */
    static async getLoadById(req, res) {
        const { id } = req.params;
        try {
            const load = await LoadModel.getById(id);
            if (!load) return res.status(404).json({ error: 'Load not found' });
            res.json(load);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch load details' });
        }
    }

    /**
     * Create new load
     */
    static async createLoad(req, res) {
        const { 
            pickup, drop_location, weight, truck_type, price, consignor, consignee,
            gr, fright, payment, box, station, from_to, bal, sur, shortage 
        } = req.body;
        
        if (!pickup || !drop_location || !weight) {
            return res.status(400).json({ error: 'Pickup, Drop and Weight are required' });
        }

        try {
            const loadId = await LoadModel.create({
                pickup, 
                drop_location, 
                weight, 
                truck_type: truck_type || 'General Cargo', 
                price: price || 0, 
                consignor: consignor || 'Not Assigned', 
                consignee: consignee || 'Not Assigned',
                status: 'PENDING',
                gr: gr || '-',
                fright: fright || 0,
                payment: payment || 0,
                box: box || '-',
                station: station || '-',
                from_to: from_to || '-',
                bal: bal || 0,
                sur: sur || 0,
                shortage: shortage || 0
            });
            res.status(201).json({ message: 'Load created successfully', loadId });
        } catch (e) {
            console.error('--- [CRITICAL] Load Creation Error ---', e.message);
            if (e.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This Load already exists (Duplicate Entry).' });
            }
            res.status(500).json({ error: 'Database Error: ' + e.message });
        }
    }

    /**
     * Delete load
     */
    static async deleteLoad(req, res) {
        const { id } = req.params;
        try {
            await LoadModel.delete(id);
            res.json({ message: 'Load deleted successfully' });
        } catch (e) {
            res.status(500).json({ error: 'Failed to delete load' });
        }
    }
}

module.exports = LoadController;
