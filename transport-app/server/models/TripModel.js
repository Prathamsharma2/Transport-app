const { pool } = require('../config/db');

class TripModel {
    /**
     * Create a new trip
     */
    static async create(tripData) {
        const { load_id, vehicle_id, driver_id, start_location, end_location, status, created_by } = tripData;
        const [result] = await pool.query(
            'INSERT INTO trips (load_id, vehicle_id, driver_id, start_location, end_location, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [load_id, vehicle_id, driver_id, start_location, end_location, status || 'pending', created_by]
        );
        return result.insertId;
    }

    /**
     * Find a trip by ID with fully populated data (for Trip Summary)
     */
    static async findById(id) {
        // 1. Get Trip and basic info
        const [rows] = await pool.query(`
            SELECT t.*, d.name as driver_name, d.phone as driver_phone, 
                   v.vehicle_number, v.type as vehicle_type,
                   l.pickup as load_pickup, l.drop_location as load_drop, l.truck_type as load_title, l.weight as load_weight
            FROM trips t
            LEFT JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN loads l ON t.load_id = l.id
            WHERE t.id = ?
        `, [id]);

        if (rows.length === 0) return null;
        const trip = rows[0];

        // 2. Get Expenses for this trip
        const [expenses] = await pool.query('SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC', [id]);
        trip.expenses = expenses;

        // 3. Get Invoices (Revenue) for this trip
        const [invoices] = await pool.query('SELECT * FROM invoices WHERE trip_id = ? ORDER BY created_at DESC', [id]);
        trip.invoices = invoices;

        return trip;
    }

    /**
     * Get all trips (Super Admin/Admin)
     */
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT t.*, d.name as driver_name, v.vehicle_number, l.pickup as load_pickup
            FROM trips t
            LEFT JOIN drivers d ON t.driver_id = d.id
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN loads l ON t.load_id = l.id
            ORDER BY t.id DESC
        `);
        return rows;
    }

    /**
     * Get trips assigned to a specific driver
     */
    static async getByDriverId(driver_id) {
        const [rows] = await pool.query(`
            SELECT t.*, v.vehicle_number, l.pickup as load_pickup
            FROM trips t
            LEFT JOIN vehicles v ON t.vehicle_id = v.id
            LEFT JOIN loads l ON t.load_id = l.id
            WHERE t.driver_id = ?
            ORDER BY t.created_at DESC
        `, [driver_id]);
        return rows;
    }

    /**
     * Update trip data
     */
    static async update(id, updateData) {
        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateData);
        await pool.query(`UPDATE trips SET ${fields} WHERE id = ?`, [...values, id]);
    }

    /**
     * Delete trip (Super Admin only - Override power)
     */
    static async delete(id) {
        await pool.query('DELETE FROM trips WHERE id = ?', [id]);
    }
}

module.exports = TripModel;
