const axios = require('axios');

const base_url = "http://localhost:3000";

async function test_routes() {
    console.log("--- Starting Backend API Tests ---");
    
    // 1. Welcome
    try {
        const r = await axios.get(`${base_url}/`);
        console.log(`1. Welcome: ${r.status_code} - ${r.data.message}`);
    } catch (e) {
        console.log(`1. Welcome: ${e.response ? e.response.status : e.message} - ${e.response ? JSON.stringify(e.response.data) : ''}`);
    }

    // 2. Register
    const payload = {
        username: "admin_test_" + Date.now(),
        password: "password123",
        role: "admin"
    };
    try {
        const r = await axios.post(`${base_url}/api/auth/register`, payload);
        console.log(`2. Register: ${r.status} - ${r.data.message || r.data.error}`);
    } catch (e) {
        console.log(`2. Register FAILED: ${e.response ? e.response.status : e.message} - ${JSON.stringify(e.response ? e.response.data : '')}`);
    }

    // 3. Login
    try {
        const r = await axios.post(`${base_url}/api/auth/login`, payload);
        console.log(`3. Login: ${r.status} - ${r.data.message || r.data.error}`);
        if (r.status === 200) {
            const token = r.data.token;
            console.log(`   Token received: ${token.substring(0, 20)}...`);
        }
    } catch (e) {
        console.log(`3. Login FAILED: ${e.response ? e.response.status : e.message} - ${JSON.stringify(e.response ? e.response.data : '')}`);
    }

    // 4. Health
    try {
        const r = await axios.get(`${base_url}/api/health`);
        console.log(`4. Health: ${r.status} - ${r.data.status}`);
    } catch (e) {
        console.log(`4. Health FAILED: ${e.response ? e.response.status : e.message} - ${JSON.stringify(e.response ? e.response.data : '')}`);
    }
}

test_routes();
