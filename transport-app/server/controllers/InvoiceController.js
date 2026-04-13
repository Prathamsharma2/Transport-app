const InvoiceModel = require('../models/InvoiceModel');

class InvoiceController {
    /**
     * Get all invoices (Admin/Staff)
     */
    static async getAllInvoices(req, res) {
        try {
            const invoices = await InvoiceModel.getAll();
            res.json(invoices);
        } catch (e) {
            console.error('--- Invoice Controller Error (List):', e.id, e.message);
            res.status(500).json({ error: 'Failed to fetch invoices' });
        }
    }

    /**
     * Generate an invoice with full billing details
     */
    static async createInvoice(req, res) {
        const { 
            trip_id, amount, rate, freight, advance, 
            balance, other_charges, insurance_company, policy_no 
        } = req.body;

        if (!trip_id || !amount) return res.status(400).json({ error: 'Trip and Amount are required' });
        
        try {
            const invoiceId = await InvoiceModel.create({ 
                trip_id, amount, rate, freight, advance, 
                balance, other_charges, insurance_company, policy_no 
            });
            res.status(201).json({ message: 'Invoice generated successfully', invoiceId });
        } catch (e) {
            console.error('--- Invoice Controller Error (Create):', e.message);
            res.status(500).json({ error: 'Failed to generate invoice: ' + e.message });
        }
    }

    /**
     * Get single invoice details (for printing)
     */
    static async getInvoiceById(req, res) {
        const { id } = req.params;
        try {
            const invoice = await InvoiceModel.findById(id);
            if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
            res.json(invoice);
        } catch (e) {
            res.status(500).json({ error: 'Failed to fetch invoice details' });
        }
    }

    /**
     * Mark Invoice as Paid/Unpaid
     */
    static async updateInvoiceStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;
        if (!['paid', 'unpaid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

        try {
            await InvoiceModel.updateStatus(id, status);
            res.json({ message: `Invoice marked as ${status.toUpperCase()}` });
        } catch (e) {
            res.status(500).json({ error: 'Failed to update invoice status' });
        }
    }

    /**
     * Get monthly reports summary
     */
    static async getMonthlySummary(req, res) {
        try {
            const summary = await InvoiceModel.getMonthlySummary();
            res.json(summary);
        } catch (e) {
            console.error('--- Invoice Controller Error (Summary):', e.message);
            res.status(500).json({ error: 'Failed to fetch monthly summary' });
        }
    }
}

module.exports = InvoiceController;
