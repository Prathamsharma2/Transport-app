const UpdateModel = require('../models/UpdateModel');

class UpdateController {
    /**
     * Check for newer version
     */
    static async checkUpdate(req, res) {
        const { platform, currentVersion } = req.query;
        try {
            const latest = await UpdateModel.getLatest(platform);
            if (!latest) return res.json({ updateAvailable: false });

            // Simple version comparison (e.g., 1.0.1 < 1.0.2)
            const isNewer = latest.version > currentVersion;

            res.json({
                updateAvailable: isNewer,
                latestVersion: latest.version,
                url: latest.url,
                notes: latest.release_notes
            });
        } catch (e) {
            console.error('--- Update Check Error:', e.message);
            res.status(500).json({ error: 'Failed to check for updates' });
        }
    }

    /**
     * Post a new update (Superadmin/Admin)
     */
    static async postUpdate(req, res) {
        const { version, url, platform, notes } = req.body;
        if (!version || !url || !platform) return res.status(400).json({ error: 'Version, URL, and Platform are required' });
        try {
            const updateId = await UpdateModel.create({ version, url, platform, notes });
            res.status(201).json({ message: 'Update record created successfully', updateId });
        } catch (e) {
            console.error('--- Update Post Error:', e.message);
            res.status(500).json({ error: 'Failed to post update: ' + e.message });
        }
    }
}

module.exports = UpdateController;
