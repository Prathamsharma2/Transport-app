const { pool } = require('./server/config/db');

async function migrate() {
    console.log('--- 🚀 Starting Billing Migration ---');
    try {
        // Add new billing columns to invoices
        await pool.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS rate FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS freight FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS advance FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS balance FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS other_charges FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(255),
            ADD COLUMN IF NOT EXISTS policy_no VARCHAR(255)
        `);
        
        // Ensure status is consistent
        await pool.query("UPDATE invoices SET status = 'unpaid' WHERE status IS NULL OR status = ''");
        
        console.log('--- ✅ Billing Migration Successful ---');
    } catch (e) {
        console.error('--- ❌ Migration Failed:', e.message);
    } finally {
        process.exit();
    }
}

migrate();
