const BASE_URL_NODE = 'http://localhost:5000/api';
const BASE_URL_PYTHON = 'http://localhost:8000';

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 2000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function testNodeRateLimit() {
    console.log('Testing Node.js Rate Limiting...');
    // This takes a while, uncomment to test properly. 
    // For quick check, we can check headers or just send a few requests.
    let successCount = 0;
    let failureCount = 0;
    const requests = [];

    // Send 110 requests
    for (let i = 0; i < 110; i++) {
        requests.push(
            fetchWithTimeout(`${BASE_URL_NODE}/health`)
                .then((res) => {
                    if (res.status === 200) successCount++;
                    else if (res.status === 429) failureCount++;
                })
                .catch(() => { }) // Ignore errors for now
        );
    }

    await Promise.all(requests);
    console.log(`Node.js Rate Limit Results: Success: ${successCount}, 429s: ${failureCount}`);
    if (failureCount > 0) console.log('✅ Node.js Rate Limiting Verified');
    else console.log('⚠️ Node.js Rate Limiting not triggered (expected if limit > 110 or window > test duration)');
}

async function testPythonRateLimit() {
    console.log('\nTesting Python AI Service Rate Limiting...');
    let successCount = 0;
    let failureCount = 0;

    // Try one request first
    try {
        const res = await fetchWithTimeout(`${BASE_URL_PYTHON}/`);
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
            const res = await fetchWithTimeout(`${BASE_URL_PYTHON}/`);
            if (res.status === 200) successCount++;
            else if (res.status === 429) failureCount++;
            else console.log(`Python Request ${i} status: ${res.status}`);
        } catch (err) {
            console.log(`Python Request ${i} failed: ${err.message}`);
        }
    }

    console.log(`Python Rate Limit Results: Success: ${successCount}, 429s: ${failureCount}`);
    if (failureCount > 0) console.log('✅ Python Rate Limiting Verified');
    else console.log('❌ Python Rate Limiting Failed');
}

async function testInputValidation() {
    console.log('\nTesting Node.js Input Validation...');

    try {
        const res = await fetchWithTimeout(`${BASE_URL_NODE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'bad-email' })
        });

        if (res.status === 400) {
            const data = await res.json();
            console.log('✅ Input Validation Verified: Got 400 Bad Request');
            console.log('Error Details:', JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ Input Validation Failed: Got status ${res.status}`);
        }
    } catch (err) {
        console.log(`Validation Test Error: ${err.message}`);
    }
}

async function runTests() {
    await testInputValidation();
    await testPythonRateLimit();
}

runTests();
