const express = require('express');
const router = express.Router();
const LedgerController = require('../controllers/LedgerController');

router.get('/', LedgerController.getLedgerEntries);
router.post('/seed', LedgerController.seedLedgerEntries);
router.post('/seed-all', LedgerController.seedMainApp);

module.exports = router;
