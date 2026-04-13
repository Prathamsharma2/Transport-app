const LedgerModel = require('../models/LedgerModel');

class LedgerController {
    static async getLedgerEntries(req, res) {
        try {
            const entries = await LedgerModel.getAll();
            res.json({ success: true, count: entries.length, data: entries });
        } catch (error) {
            console.error('Error fetching ledger entries:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async seedLedgerEntries(req, res) {
        try {
            const count = await LedgerModel.count();
            if (count > 0) {
                return res.json({ success: true, message: 'Database already populated.' });
            }

            const mockData = [
                { date: '1-Mar-26', truck_no: 'RJ13GC2921', station: 'SGNR', gr: '15254', weight: '319.93KG', fright: '36788', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '36788', sur: '0', shortage: '' },
                { date: '1-Mar-26', truck_no: 'RJ25GA8624', station: 'BHADARK', gr: '15255', weight: '309.20KG', fright: '130313', payment: '129009', box: '1833', from_to: 'KOGM SGNR', bal: '1304', sur: '0', shortage: '' },
                { date: '2-Mar-26', truck_no: 'RJ13CB7844', station: 'SGNR', gr: '15257', weight: '324.00KG', fright: '37260', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '37260', sur: '0', shortage: '' },
                { date: '2-Mar-26', truck_no: 'RJ07GD1235', station: 'SGNR', gr: '15258', weight: '311.70KG', fright: '38145', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '38145', sur: '0', shortage: '' },
                { date: '2-Mar-26', truck_no: 'RJ07GE0096', station: 'SGNR', gr: '15262', weight: '324.70KG', fright: '37340', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '37340', sur: '0', shortage: '' },
                { date: '2-Mar-26', truck_no: 'RJ07GD1144', station: 'SGNR', gr: '15261', weight: '33.40KG', fright: '36041', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '36041', sur: '0', shortage: '' },
                { date: '3-Mar-26', truck_no: 'PB10JC7297', station: 'SGNR', gr: '15263', weight: '399.20KG', fright: '45908', payment: '45233', box: 'CAKE', from_to: 'KOGM SGNR', bal: '675', sur: '0', shortage: '' },
                { date: '3-Mar-26', truck_no: 'RJ11GC1686', station: 'CHANDIGARH', gr: '15264', weight: '199.60KG', fright: '37204', payment: '36831', box: '1289', from_to: 'KOGM CHANDIGARH', bal: '373', sur: '0', shortage: '' },
                { date: '5-Mar-26', truck_no: 'JH03AF2798', station: 'JADAVPUR', gr: '15265', weight: '295.20KG', fright: '130327', payment: '239080', box: '', from_to: 'KOGM KALCUTTA', bal: '', sur: '', shortage: '108753' },
                { date: '5-Mar-26', truck_no: 'PB04AE8890', station: 'SGNR', gr: '15266', weight: '397.30KG', fright: '45690', payment: '45171', box: 'CAKE', from_to: 'KOGM SGNR', bal: '519', sur: '0', shortage: '' },
                { date: '7-Mar-26', truck_no: 'RJ50G84449', station: 'SGNR', gr: '15269', weight: '283.20KG', fright: '35400', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '35400', sur: '0', shortage: '' },
                { date: '10-Mar-26', truck_no: 'PR10GK5781', station: 'SGNR', gr: '15273', weight: '315.10KG', fright: '39387', payment: '38993', box: 'CAKE', from_to: 'KOGM SGNR', bal: '394', sur: '0', shortage: '' },
                { date: '11-Mar-26', truck_no: 'HR63D7510', station: 'SGNR', gr: '15277', weight: '293.80KG', fright: '36725', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '36725', sur: '0', shortage: '' },
                { date: '12-Mar-26', truck_no: 'WB23E6836', station: 'SGNR', gr: '15278', weight: '288.01KG', fright: '36013', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '36013', sur: '0', shortage: '' },
                { date: '12-Mar-26', truck_no: 'RJ13GC5132', station: 'SGNR', gr: '15280', weight: '241.90KG', fright: '53866', payment: '308735', box: 'CAKE', from_to: 'KOGM SGNR', bal: '', sur: '', shortage: '274869' },
                { date: '13-Mar-26', truck_no: 'PB03BR9561', station: 'SGNR', gr: '15281', weight: '286.80KG', fright: '40152', payment: '52085', box: 'CAKE', from_to: 'KOGM SGNR', bal: '', sur: '', shortage: '11933' },
                { date: '13-Mar-26', truck_no: 'PB03AP7593', station: 'SGNR', gr: '15282', weight: '322.20KG', fright: '45108', payment: '218210', box: 'CAKE', from_to: 'KOGM SGNR', bal: '', sur: '', shortage: '173102' },
                { date: '13-Mar-26', truck_no: 'PB03AJ9090', station: 'SGNR', gr: '15283', weight: '326.40KG', fright: '45766', payment: '45433', box: 'CAKE', from_to: 'KOGM SGNR', bal: '333', sur: '0', shortage: '' },
                { date: '13-Mar-26', truck_no: 'HR57A9700', station: 'SGNR', gr: '15284', weight: '317.00KG', fright: '44300', payment: '43548', box: 'CAKE', from_to: 'KOGM SGNR', bal: '752', sur: '0', shortage: '' },
                { date: '14-Mar-26', truck_no: 'RJ13GC7089', station: 'SGNR', gr: '15285', weight: '234.40KG', fright: '32816', payment: '137802', box: 'CAKE', from_to: 'KOGM SGNR', bal: '', sur: '', shortage: '104986' },
                { date: '14-Mar-26', truck_no: 'HR55U1785', station: 'SGNR', gr: '15286', weight: '324.70KG', fright: '45458', payment: '114767', box: 'CAKE', from_to: 'KOGM SGNR', bal: '', sur: '', shortage: '69309' },
                { date: '15-Mar-26', truck_no: 'KL01CU3143', station: 'SGNR', gr: '15287', weight: '358.40KG', fright: '50176', payment: '134057', box: 'CAKE', from_to: 'KOGM SGNR', bal: '0', sur: '0', shortage: '83881' },
                { date: '15-Mar-26', truck_no: 'HR57A0333', station: 'SGNR', gr: '15288', weight: '310.70KG', fright: '43498', payment: '138605', box: 'CAKE', from_to: 'KOGM SGNR', bal: '0', sur: '0', shortage: '95107' },
                { date: '16-Mar-26', truck_no: 'RJ11GB9965', station: 'SGNR', gr: '15289', weight: '336.10KG', fright: '47054', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '47054', sur: '0', shortage: '' },
                { date: '16-Mar-26', truck_no: 'RJ49GA8541', station: 'SGNR', gr: '15290', weight: '246.70KG', fright: '34583', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '34583', sur: '0', shortage: '' },
                { date: '17-Mar-26', truck_no: 'PB03AS9599', station: 'SGNR', gr: '15292', weight: '382.60KG', fright: '53564', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '53564', sur: '0', shortage: '' },
                { date: '18-Mar-26', truck_no: 'JH08AF2798', station: 'JADAVPUR', gr: '15295', weight: '', fright: '127115', payment: '', box: '', from_to: '', bal: '127115', sur: '0', shortage: '60KG SHOT' },
                { date: '19-Mar-26', truck_no: 'HP09DS871', station: 'SGNR', gr: '15296', weight: '327.80KG', fright: '45892', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '45892', sur: '0', shortage: '' },
                { date: '19-Mar-26', truck_no: 'PB05A9599', station: 'SGNR', gr: '15298', weight: '393.40KG', fright: '53676', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '53676', sur: '0', shortage: '' },
                { date: '19-Mar-26', truck_no: 'PB05AU9599', station: 'SGNR', gr: '15299', weight: '328.60KG', fright: '46001', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '46001', sur: '0', shortage: '60KG SHOT' },
                { date: '20-Mar-26', truck_no: 'RJ13GB9009', station: 'SGNR', gr: '15301', weight: '314.20KG', fright: '43988', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '43988', sur: '0', shortage: '' },
                { date: '20-Mar-26', truck_no: 'RJ11GB4308', station: 'KOLCATTA', gr: '15302', weight: '321.30KG', fright: '135412', payment: '', box: '2094', from_to: 'KOGM KALCUTTA', bal: '135412', sur: '0', shortage: '' },
                { date: '21-Mar-26', truck_no: 'RJ13GB9401', station: 'SGNR', gr: '15303', weight: '282.90KG', fright: '39606', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '39606', sur: '0', shortage: '' },
                { date: '21-Mar-26', truck_no: 'HR57A0333', station: 'SGNR', gr: '15613', weight: '31.050MT', fright: '38813', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '38813', sur: '0', shortage: '' },
                { date: '23-Mar-26', truck_no: 'RJ13GC5289', station: 'SGNR', gr: '15307', weight: '319.50KG', fright: '44730', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '44730', sur: '0', shortage: '' },
                { date: '24-Mar-26', truck_no: 'RJ27GD6323', station: 'SGNR', gr: '15309', weight: '24 MT', fright: '33656', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '33656', sur: '0', shortage: '' },
                { date: '24-Mar-26', truck_no: 'RJ50G84449', station: 'SGNR', gr: '15312', weight: '28.230MT', fright: '39522', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '39522', sur: '0', shortage: '' },
                { date: '24-Mar-26', truck_no: 'RJ07GE2674', station: 'SGNR', gr: '15313', weight: '386.4KG', fright: '54096', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '54096', sur: '0', shortage: '' },
                { date: '24-Mar-26', truck_no: 'RJ07GD2274', station: 'SGNR', gr: '15314', weight: '382.40KG', fright: '53536', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '53536', sur: '0', shortage: '' },
                { date: '25-Mar-26', truck_no: 'RJ13GD3551', station: 'SGNR', gr: '15315', weight: '334.10KG', fright: '46774', payment: '', box: 'CAKE', from_to: 'KOGM SGNR', bal: '46774', sur: '0', shortage: '' },
                { date: '25-Mar-26', truck_no: 'RJ07GC1470', station: 'SGNR', gr: '15316', weight: '31.950MT', fright: '44730', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '44730', sur: '0', shortage: '' },
                { date: '25-Mar-26', truck_no: 'RJ07GE2956', station: 'SGNR', gr: '15317', weight: '33.260MT', fright: '46564', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '46564', sur: '0', shortage: '' },
                { date: '25-Mar-26', truck_no: 'RJ07GD6001', station: 'SGNR', gr: '15318', weight: '32.980MT', fright: '46074', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '46074', sur: '0', shortage: '' },
                { date: '26-Mar-26', truck_no: 'RJ13GB0779', station: 'SGNR', gr: '15319', weight: '32.380MT', fright: '45332', payment: '', box: 'CAKE', from_to: 'KOGM', bal: '45332', sur: '0', shortage: '' },
                { date: '31-Mar-26', truck_no: '', station: '', gr: '', weight: '', fright: '', payment: '106555', box: '', from_to: '', bal: '', sur: '', shortage: '106555' },
                { date: '31-Mar-26', truck_no: '', station: '', gr: '', weight: '', fright: '', payment: '227177', box: '', from_to: '', bal: '', sur: '', shortage: '227177' }
            ];

            await LedgerModel.insertMany(mockData);
            res.json({ success: true, message: 'Database seeded successfully with required mock data.' });
        } catch (error) {
            console.error('Error seeding ledger entries:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async seedMainApp(req, res) {
        const { pool } = require('../config/db');
        try {
            // 1. Seed Vehicles
            await pool.query(`INSERT IGNORE INTO vehicles (id, vehicle_number, type, capacity) VALUES 
                (1, 'RJ 13 GA 1234', '10 Wheeler', 20),
                (2, 'MH 12 AB 5678', '12 Wheeler', 25),
                (3, 'PB 03 AS 9999', 'Open Body', 15),
                (4, 'HR 55 U 1785', 'Trailer', 35)`);

            // 2. Seed Drivers
            await pool.query(`INSERT IGNORE INTO drivers (id, name, phone, status, joined_date) VALUES 
                (1, 'Rajesh Kumar', '9876543210', 'AVAILABLE', '2025-01-10'),
                (2, 'Suresh Singh', '9988776655', 'AVAILABLE', '2025-02-15'),
                (3, 'Amit Sharma', '9123456789', 'AVAILABLE', '2025-03-01')`);

            // 3. Seed Loads
            await pool.query(`INSERT IGNORE INTO loads (id, pickup, drop_location, weight, price, status, gr, fright, payment, box, shortage, bal) VALUES 
                (1, 'Alwar, RJ', 'Srimadhopur, RJ', 20, 35000, 'PENDING', 'GR-101', 32000, 30000, 'CAKE', 0, 2000),
                (2, 'Jaipur, RJ', 'Delhi, NCR', 15, 22000, 'PENDING', 'GR-102', 20000, 18000, 'BISCUIT', 0, 2000),
                (3, 'Ahmedabad, GJ', 'Mumbai, MH', 25, 45000, 'PENDING', 'GR-103', 42000, 40000, '1833', 500, 1500)`);

            // 4. Seed Trips (Assigning some to make it look active)
            await pool.query(`INSERT IGNORE INTO trips (id, load_id, vehicle_id, driver_id, start_location, end_location, status) VALUES 
                (1, 1, 1, 1, 'Alwar', 'Srimadhopur', 'pending'),
                (2, 2, 2, 2, 'Jaipur', 'Delhi', 'pending')`);

            res.json({ success: true, message: 'Main app tables seeded successfully with demo data.' });
        } catch (error) {
            console.error('Error seeding main app:', error);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
}

module.exports = LedgerController;
