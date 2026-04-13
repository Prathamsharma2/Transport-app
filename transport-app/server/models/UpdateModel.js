const { pool } = require('../config/db');

class UpdateModel {
    /**
     * Get latest version for a platform
     */
    static async getLatest(platform) {
        const [rows] = await pool.query(
            'SELECT * FROM app_updates WHERE platform = ? ORDER BY created_at DESC LIMIT 1',
            [platform]
        );
        return rows[0];
    }

    /**
     * Post a new update (Superadmin)
     */
    static async create({ version, url, platform, notes }) {
        const [result] = await pool.query(
            'INSERT INTO app_updates (version, url, platform, release_notes) VALUES (?, ?, ?, ?)',
            [version, url, platform, notes]
        );
        return result.insertId;
    }
}

module.exports = UpdateModel;
