const { pool } = require('../config/db');

class LedgerModel {
    static async getAll() {
        const query = `SELECT * FROM ledger_entries ORDER BY id ASC`;
        const [rows] = await pool.query(query);
        return rows;
    }

    static async insertMany(entries) {
        if (entries.length === 0) return;
        
        const query = `
            INSERT INTO ledger_entries 
            (date, truck_no, station, gr, weight, fright, payment, box, from_to, bal, sur, shortage)
            VALUES ?
        `;
        const values = entries.map(e => [
            e.date || '', e.truck_no || '', e.station || '', e.gr || '', e.weight || '',
            e.fright || '', e.payment || '', e.box || '', e.from_to || '',
            e.bal || '', e.sur || '', e.shortage || ''
        ]);

        await pool.query(query, [values]);
    }

    static async count() {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM ledger_entries');
        return rows[0].count;
    }
}

module.exports = LedgerModel;
