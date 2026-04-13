const express = require('express');
const app = express();
const PORT = 4000;

app.get('/api/health', (req, res) => {
    res.json({ status: 'Debug server is up' });
});

app.listen(PORT, () => {
    console.log(`🚀 DEBUG Server listening on http://localhost:${PORT}`);
});
