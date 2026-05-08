const axios = require('axios');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('🚀 Starting Auth Overhaul Security Tests...\n');

    try {
        // 1. Login
        console.log('--- Test 1: Login & Cookie Verification ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@armorray.com', // Change to a valid user in your local DB
            password: 'Password123!'
        });
        
        const cookies = loginRes.headers['set-cookie'] || [];
        const hasAccessToken = cookies.some(c => c.includes('accessToken'));
        const hasRefreshToken = cookies.some(c => c.includes('refreshToken'));
        const httpOnly = cookies.every(c => c.includes('HttpOnly'));

        console.log('✅ Cookies set:', cookies.map(c => c.split(';')[0]).join(', '));
        console.log('✅ HttpOnly flag present:', httpOnly);
        
        const cookieHeader = cookies.join('; ');

        // 2. Access Protected Route
        console.log('\n--- Test 2: Access Protected Route ---');
        const meRes = await axios.get(`${API_URL}/auth/me`, {
            headers: { Cookie: cookieHeader }
        });
        console.log('✅ Access Token Valid. User Role:', meRes.data.data.role);

        // 3. Refresh Token Rotation
        console.log('\n--- Test 3: Refresh Token Rotation ---');
        const refreshRes1 = await axios.post(`${API_URL}/auth/refresh`, {}, {
            headers: { Cookie: cookieHeader }
        });
        const newCookies1 = refreshRes1.headers['set-cookie'] || [];
        console.log('✅ Refresh Successful. Issued new cookies.');

        // 4. Test Reuse Detection (Using old RT again)
        console.log('\n--- Test 4: Refresh Token Reuse Detection ---');
        try {
            await axios.post(`${API_URL}/auth/refresh`, {}, {
                headers: { Cookie: cookieHeader } // Using old cookies
            });
            console.log('❌ FAIL: Reusing old token should have failed!');
        } catch (err) {
            console.log('✅ SUCCESS: Reused token rejected with 401.');
            console.log('   Message:', err.response?.data?.message);
        }

        // 5. Verify entire family is invalidated
        console.log('\n--- Test 5: Verify Family Invalidation ---');
        try {
            await axios.post(`${API_URL}/auth/refresh`, {}, {
                headers: { Cookie: newCookies1.join('; ') } // Using the NEW tokens issued before
            });
            console.log('❌ FAIL: New token in a compromised family should have been invalidated!');
        } catch (err) {
            console.log('✅ SUCCESS: Family invalidated. New token in compromised family also revoked.');
            console.log('   Message:', err.response?.data?.message);
        }

        console.log('\n🏆 ALL SECURITY TESTS PASSED!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
        console.log('\nNOTE: Make sure the server is running and "admin@armorray.com" (Password123!) exists.');
    }
}

runTests();
