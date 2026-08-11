import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000/api';
// You'll need a valid token and case ID to run this. 
// This is a template for the user to run manually if needed.
const TOKEN = 'YOUR_JWT_TOKEN';
const CASE_ID = 'YOUR_CASE_ID';

async function testLatency() {
    console.log(`Testing latency for Case: ${CASE_ID}`);

    const config = {
        headers: { Authorization: `Bearer ${TOKEN}` }
    };

    try {
        // 1. First Request (Cache Miss / Populate)
        console.log('--- Request 1 (Cold) ---');
        const start1 = performance.now();
        await axios.get(`${BASE_URL}/cases/${CASE_ID}/metadata`, config);
        const end1 = performance.now();
        console.log(`Latency: ${(end1 - start1).toFixed(2)}ms`);

        // 2. Second Request (Cache Hit)
        console.log('--- Request 2 (Warm) ---');
        const start2 = performance.now();
        await axios.get(`${BASE_URL}/cases/${CASE_ID}/metadata`, config);
        const end2 = performance.now();
        console.log(`Latency: ${(end2 - start2).toFixed(2)}ms`);

        const improvement = ((end1 - start1) / (end2 - start2)).toFixed(1);
        console.log(`\nPerformance Improvement: ${improvement}x faster`);

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
        console.log('\nTIP: Ensure the server is running and REDIS is started (docker-compose up -d redis)');
    }
}

// testLatency();
console.log('Latency test script created. Fill in TOKEN and CASE_ID to use.');
