const NotificationModel = require('../models/NotificationModel');

class NotificationController {
    /**
     * Send Update (Create Notification)
     * POST /api/notifications
     */
    static async sendUpdate(req, res) {
        const { title, message } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        try {
            const id = await NotificationModel.create({ title, message });
            res.status(201).json({
                message: 'Notification sent successfully',
                data: { id, title, message }
            });
        } catch (error) {
            console.error('Error in sendUpdate:', error);
            res.status(500).json({ error: 'Failed to send notification' });
        }
    }

    /**
     * Get Updates (List Notifications)
     * GET /api/notifications
     */
    static async getUpdates(req, res) {
        try {
            const notifications = await NotificationModel.getAll();
            res.json(notifications);
        } catch (error) {
            console.error('Error in getUpdates:', error);
            res.status(500).json({ error: 'Failed to retrieve notifications' });
        }
    }
}

module.exports = NotificationController;
