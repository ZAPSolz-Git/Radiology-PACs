import axios from 'axios';

const BASE_URL_NODE = 'http://localhost:5000/api';
// Ensure we use the correct port for AI service
const BASE_URL_PYTHON = 'http://localhost:8000';

const client = axios.create({
    timeout: 2000, // 2 seconds timeout
    validateStatus: () => true // Don't throw on error status codes
});

async function testNodeRateLimit() {
    console.log('Testing Node.js Rate Limiting...');
    let successCount = 0;
    let failureCount = 0;
    const requests = [];

    // Send 110 requests (limit is 100)
    for (let i = 0; i < 110; i++) {
        requests.push(
            client.get(`${BASE_URL_NODE}/health`)
                .then((res) => {
                    if (res.status === 200) successCount++;
                    else if (res.status === 429) failureCount++;
                    else console.log(`Node Request ${i} status: ${res.status}`);
                })
                .catch((err) => {
                    console.log(`Node Request ${i} failed: ${err.message}`);
                })
        );
    }

    await Promise.all(requests);
    console.log(`Node.js Rate Limit Results: Success: ${successCount}, 429s: ${failureCount}`);
}

async function testPythonRateLimit() {
    console.log('\nTesting Python AI Service Rate Limiting...');
    let successCount = 0;
    let failureCount = 0;

    // Try one request first to see if server is up
    try {
        const res = await client.get(`${BASE_URL_PYTHON}/`);
        console.log(`AI Service Health Check: ${res.status}`);
        if (res.status !== 200) {
            console.log('AI Service not healthy, skipping rate limit test');
            return;
        }
        successCount++;
    } catch (err) {
        console.log(`AI Service unreachable: ${err.message}`);
        return;
    }

    // Limit is 5/minute
    for (let i = 0; i < 10; i++) {
        try {
            const res = await client.get(`${BASE_URL_PYTHON}/`);
            if (res.status === 200) successCount++;
            else if (res.status === 429) failureCount++;
            else console.log(`Python Request ${i} status: ${res.status}`);
        } catch (err) {
            console.log(`Python Request ${i} failed: ${err.message}`);
        }
    }

    console.log(`Python Rate Limit Results: Success: ${successCount}, 429s: ${failureCount}`);
}

async function testInputValidation() {
    console.log('\nTesting Node.js Input Validation...');

    try {
        // Missing password
        const res = await client.post(`${BASE_URL_NODE}/auth/login`, {
            email: 'invalid-email', // Invalid email format
        });

        if (res.status === 400) {
            console.log('✅ Input Validation Verified: Got 400 Bad Request');
            console.log('Error Details:', JSON.stringify(res.data, null, 2));
        } else {
            console.log(`❌ Input Validation Failed: Got status ${res.status}`);
        }
    } catch (err) {
        console.log(`Validation Test Error: ${err.message}`);
    }
}

async function runTests() {
    await testPythonRateLimit();
    await testInputValidation();
}

runTests();
