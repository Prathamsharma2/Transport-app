console.log('--- [DEBUG] Server starting ---');
require('dotenv').config();
console.log('--- [DEBUG] Dotenv loaded ---');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
console.log('--- [DEBUG] Modules required ---');
const { initSchema } = require('./config/db');
console.log('--- [DEBUG] Database module loaded ---');

const authRoutes = require('./routes/authRoutes');
const indexRoutes = require('./routes/indexRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const driverRoutes = require('./routes/driverRoutes');
const loadRoutes = require('./routes/loadRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const reportRoutes = require('./routes/reportRoutes');
console.log('--- [DEBUG] Routes loaded ---');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const updateRoutes = require('./routes/updateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');

const PORT = process.env.PORT || 4000;

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/loads', loadRoutes);
app.use('/api/finance', expenseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api', indexRoutes);

// Welcome route for testing
app.get('/', (req, res) => {
    res.json({ 
        message: 'Transport Management System API is live', 
        description: 'New refactored backend structure with MVC pattern'
    });
});

// START LISTENING FIRST
app.listen(PORT, () => {
    console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    
    // THEN INITIALIZE DATABASE
    console.log('--- Initializing Database (MySQL Hostinger) ---');
    initSchema()
        .then(() => console.log('✅ Database synchronized successfully'))
        .catch(err => {
            console.error('❌ Database initialization CRITICALLY FAILED:');
            console.error(err.message);
        });
});
