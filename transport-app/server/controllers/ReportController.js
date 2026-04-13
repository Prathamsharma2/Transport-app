const ReportModel = require('../models/ReportModel');

class ReportController {
    /**
     * Get Financial Analytics
     */
    static async getAnalytics(req, res) {
        let { from, to } = req.query;
        
        // Defaults to current month if not provided
        if (!from) {
            const firstDay = new Date();
            firstDay.setDate(1);
            from = firstDay.toISOString().split('T')[0] + ' 00:00:00';
        }
        if (!to) {
            const lastDay = new Date();
            // Set to end of today
            to = lastDay.toISOString().split('T')[0] + ' 23:59:59';
        }

        try {
            const summary = await ReportModel.getFinancialSummary(from, to);
            const breakdown = await ReportModel.getTripBreakdown(from, to);
            
            res.json({
                summary,
                breakdown
            });
        } catch (e) {
            console.error('--- Report Controller Error:', e.message);
            res.status(500).json({ error: 'Failed to fetch analytics: ' + e.message });
        }
    }
}

module.exports = ReportController;
