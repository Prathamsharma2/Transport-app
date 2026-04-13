const { pool } = require('../config/db');

class DriverModel {
    /**
     * Create a new driver
     */
    static async create(driverData) {
        const { name, phone, license_no, aadhaar_no, status, joined_date } = driverData;
        const [result] = await pool.query(
            'INSERT INTO drivers (name, phone, license_number, aadhaar_number, status, joined_date) VALUES (?, ?, ?, ?, ?, ?)',
            [name, phone, license_no || null, aadhaar_no || null, status || 'AVAILABLE', joined_date || null]
        );
        return result.insertId;
    }

    /**
     * Get all drivers (Super Admin/Admin)
     */
    static async getAll() {
        const [rows] = await pool.query('SELECT * FROM drivers ORDER BY id DESC');
        return rows;
    }

    /**
     * Find a driver by ID
     */
    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [id]);
        return rows[0];
    }

    /**
     * Update driver data
     */
    static async update(id, updateData) {
        const mappedData = { ...updateData };
        
        // Robust mapping that handles empty strings correctly
        if (Object.prototype.hasOwnProperty.call(mappedData, 'license_no')) {
            mappedData.license_number = mappedData.license_no || null;
            delete mappedData.license_no;
        }
        if (Object.prototype.hasOwnProperty.call(mappedData, 'aadhaar_no')) {
            mappedData.aadhaar_number = mappedData.aadhaar_no || null;
            delete mappedData.aadhaar_no;
        }
        
        if (Object.keys(mappedData).length === 0) return;

        const fields = Object.keys(mappedData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(mappedData);
        await pool.query(`UPDATE drivers SET ${fields} WHERE id = ?`, [...values, id]);
    }

    /**
     * Delete driver
     */
    static async delete(id) {
        await pool.query('DELETE FROM drivers WHERE id = ?', [id]);
    }

    /**
     * Block/Unblock driver (Super Admin/Admin)
     */
    static async toggleStatus(id) {
        const driver = await this.findById(id);
        if (!driver) return;
        const nextStatus = driver.status === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED';
        await pool.query('UPDATE drivers SET status = ? WHERE id = ?', [nextStatus, id]);
        return nextStatus;
    }
}

module.exports = DriverModel;
