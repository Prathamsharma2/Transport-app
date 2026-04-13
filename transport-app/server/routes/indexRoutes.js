const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const { pool } = require('../config/db');

const router = express.Router();

// Placeholder for other domain-specific routers
// In a full refactor, these would be separated into LoadsController, TripsController, etc.

router.get('/health', (req, res) => {
    res.json({ status: 'API is running', timestamp: new Date() });
});

const ExpenseModel = require('../models/ExpenseModel');
const InvoiceModel = require('../models/InvoiceModel');

router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const [tri] = await pool.query("SELECT COUNT(*) as trips FROM trips");
        const [act] = await pool.query("SELECT COUNT(*) as active FROM trips WHERE status != 'completed'");
        const [dri] = await pool.query("SELECT COUNT(*) as drivers FROM drivers");
        
        const revenue = await InvoiceModel.getRevenueStats();
        const expense = await ExpenseModel.getTotal();
        
        res.json({
            totalTrips: tri[0].trips,
            activeTrips: act[0].active,
            totalDrivers: dri[0].drivers,
            totalRevenue: revenue,
            totalExpenses: expense,
            netProfit: revenue - expense
        });
    } catch (e) {
        console.error('--- Dashboard Stats Error:', e.message);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

router.get('/vehicles', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vehicles ORDER BY id DESC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/vehicles', authMiddleware, async (req, res) => {
    try {
        const { vehicle_number, type, capacity, make, model } = req.body;
        if (!vehicle_number || !type) {
            return res.status(400).json({ error: 'Vehicle number and type are required' });
        }
        const [result] = await pool.query(
            'INSERT INTO vehicles (vehicle_number, type, capacity, make, model) VALUES (?, ?, ?, ?, ?)',
            [vehicle_number, type, capacity || 0, make || '', model || '']
        );
        res.status(201).json({ id: result.insertId, message: 'Vehicle created successfully' });
    } catch (e) {
        console.error('--- Create Vehicle Error:', e.message);
        res.status(500).json({ error: 'Failed to create vehicle' });
    }
});




module.exports = router;
