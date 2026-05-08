import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = 'http://localhost:5000/api';

async function runBenchmark() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Get a random case
        const CaseSchema = new mongoose.Schema({ studyInstanceUID: String, patientName: String });
        const Case = mongoose.model('Case', CaseSchema);
        const kase = await Case.findOne();

        if (!kase) {
            console.error('No cases found in DB. Upload a case first.');
            process.exit(1);
        }

        // 2. Get a technician or admin user to generate token
        const UserSchema = new mongoose.Schema({ email: String, role: String });
        const User = mongoose.model('User', UserSchema);
        const user = await User.findOne({ role: { $in: ['admin', 'technician', 'qa', 'radiologist'] } });

        if (!user) {
            console.error('No users found in DB.');
            process.exit(1);
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const caseId = kase._id.toString();

        console.log(`\n--- BENCHMARKING CASE: ${kase.patientName} (ID: ${caseId}) ---`);
        console.log(`Using Token for: ${user.email} (${user.role})`);

        // 3. Request 1 (COLD)
        console.log('\n[1/3] Fetching Metadata (COLD - DB lookup)...');
        const start1 = performance.now();
        await axios.get(`${BASE_URL}/cases/${caseId}/metadata`, config);
        const end1 = performance.now();
        console.log(`Latency: ${(end1 - start1).toFixed(2)}ms`);

        // 4. Request 2 (WARM - Redis hit)
        console.log('\n[2/3] Fetching Metadata (WARM - Redis Cache hit)...');
        const start2 = performance.now();
        await axios.get(`${BASE_URL}/cases/${caseId}/metadata`, config);
        const end2 = performance.now();
        console.log(`Latency: ${(end2 - start2).toFixed(2)}ms`);

        // 5. Request 3 (WARM - Redis hit again)
        console.log('\n[3/3] Fetching Metadata (WARM - Redis Cache hit again)...');
        const start3 = performance.now();
        await axios.get(`${BASE_URL}/cases/${caseId}/metadata`, config);
        const end3 = performance.now();
        console.log(`Latency: ${(end3 - start3).toFixed(2)}ms`);

        const improvement = ((end1 - start1) / (end2 - start2)).toFixed(1);
        console.log(`\n🔥 Performance Improvement: ${improvement}x faster with Redis!`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Benchmark error:', err.message);
        console.log('TIP: Ensure the backend server and Redis container are running.');
        process.exit(1);
    }
}

runBenchmark();
