/**
 * ============================================================
 *  ADVANCED DICOM VIEWER LOAD TEST  — Puppeteer Edition
 *  Supports 500 virtual users via Browser Pool + Semaphore
 * ============================================================
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────
const CONFIG = {
    // How many virtual users to simulate total
    TOTAL_USERS: 500,

    // How many tabs can be active at the SAME time.
    // On your 10-core Xeon: keep this at 30–50.
    // Each Chromium tab ≈ 100–200 MB RAM.
    // 50 concurrent × 150 MB ≈ 7.5 GB peak usage.
    CONCURRENCY: 40,

    // Number of Chromium processes to launch.
    // Tabs are round-robined across them.
    // More browsers = less per-browser pressure.
    BROWSER_COUNT: 5,

    // Delay (ms) between spawning each virtual user.
    // Even 100 ms stagger prevents a sudden login thunderstorm.
    STAGGER_MS: 150,

    URLS: {
        LOGIN: 'https://armorray.com/login',
        VIEWER: 'https://armorray.com/basic?StudyInstanceUIDs=1.2.840.1.99.1.47.1.1776928477533.844',
    },

    CREDENTIALS: {
        EMAIL: 'varun@zapwms.com',
        PASSWORD: 'Varun@24',
    },

    // How long each virtual radiologist "reads" the study (ms)
    READING_TIME_MS: 60_000,

    TIMEOUTS: {
        LOGIN_SELECTOR_MS: 30_000,
        NAVIGATION_MS: 60_000,
        VIEWER_LOAD_MS: 90_000,
    },

    // Where JSON report + CSV raw data are written
    OUTPUT_DIR: './load-test-results',
};

// ─────────────────────────────────────────────
//  SEMAPHORE  — controls concurrent tab count
// ─────────────────────────────────────────────
class Semaphore {
    #max; #active = 0; #queue = [];

    constructor(max) { this.#max = max; }

    acquire() {
        return new Promise(resolve => {
            if (this.#active < this.#max) { this.#active++; resolve(); }
            else { this.#queue.push(resolve); }
        });
    }

    release() {
        this.#active--;
        if (this.#queue.length) { this.#active++; this.#queue.shift()(); }
    }

    get activeCount() { return this.#active; }
    get queuedCount() { return this.#queue.length; }
}

// ─────────────────────────────────────────────
//  BROWSER POOL  — round-robin across instances
// ─────────────────────────────────────────────
class BrowserPool {
    #browsers = [];
    #index = 0;

    async init(count) {
        console.log(`\n🚀 Launching ${count} Chromium instance(s)…`);
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',       // avoids /dev/shm exhaustion on Linux
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--no-first-run',
            '--mute-audio',
            '--hide-scrollbars',
            '--disable-translate',
            '--disable-sync',
            '--metrics-recording-only',
        ];

        for (let i = 0; i < count; i++) {
            const b = await puppeteer.launch({ headless: true, args: launchArgs });
            this.#browsers.push(b);
            process.stdout.write(`   Browser ${i + 1}/${count} ready\n`);
        }
    }

    next() {
        return this.#browsers[this.#index++ % this.#browsers.length];
    }

    async closeAll() {
        await Promise.all(this.#browsers.map(b => b.close().catch(() => { })));
    }
}

// ─────────────────────────────────────────────
//  METRICS STORE
// ─────────────────────────────────────────────
const allResults = [];   // one entry per user

// ─────────────────────────────────────────────
//  PROGRESS DISPLAY
// ─────────────────────────────────────────────
function printProgress(sem) {
    const done = allResults.length;
    const success = allResults.filter(r => r.status === 'success').length;
    const failed = done - success;
    const pct = ((done / CONFIG.TOTAL_USERS) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(pct / 5)).padEnd(20, '░');

    process.stdout.write(
        `\r  [${bar}] ${pct.padStart(5)}% | ` +
        `Done: ${done}/${CONFIG.TOTAL_USERS} | ` +
        `✅ ${success}  ❌ ${failed} | ` +
        `Active: ${sem.activeCount}  Queued: ${sem.queuedCount}   `
    );
}

// ─────────────────────────────────────────────
//  SINGLE USER SIMULATION
// ─────────────────────────────────────────────
async function simulateUser(browser, userId, sem) {
    await sem.acquire();

    const m = {
        userId,
        status: 'pending',
        errorMessage: null,
        wallStartMs: Date.now(),
        loginStartMs: null,
        loginEndMs: null,
        viewerStartMs: null,
        viewerEndMs: null,
        wallEndMs: null,
    };

    let page;
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // ── Step 1: Login ──────────────────────────────────────
        m.loginStartMs = Date.now();
        await page.goto(CONFIG.URLS.LOGIN, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.TIMEOUTS.NAVIGATION_MS,
        });

        await page.waitForSelector('input[type="email"]', {
            timeout: CONFIG.TIMEOUTS.LOGIN_SELECTOR_MS,
        });

        await page.type('input[type="email"]', CONFIG.CREDENTIALS.EMAIL, { delay: 25 });
        await page.type('input[type="password"]', CONFIG.CREDENTIALS.PASSWORD, { delay: 25 });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUTS.NAVIGATION_MS }),
            page.click('button[type="submit"]'),
        ]);

        m.loginEndMs = Date.now();

        // ── Step 2: Load DICOM Viewer ──────────────────────────
        m.viewerStartMs = Date.now();
        await page.goto(CONFIG.URLS.VIEWER, {
            waitUntil: 'networkidle2',
            timeout: CONFIG.TIMEOUTS.VIEWER_LOAD_MS,
        });
        m.viewerEndMs = Date.now();

        // ── Step 3: Simulate reading ───────────────────────────
        await new Promise(r => setTimeout(r, CONFIG.READING_TIME_MS));

        m.status = 'success';
        m.wallEndMs = Date.now();

    } catch (err) {
        m.status = 'failed';
        m.errorMessage = err.message.split('\n')[0];   // first line only
        m.wallEndMs = Date.now();
    } finally {
        if (page) await page.close().catch(() => { });
        sem.release();
        allResults.push(m);
        printProgress(sem);
    }
}

// ─────────────────────────────────────────────
//  STATISTICS HELPERS
// ─────────────────────────────────────────────
function stats(arr) {
    if (!arr.length) return { avg: null, min: null, max: null, p50: null, p95: null, p99: null };
    const s = [...arr].sort((a, b) => a - b);
    const pct = (p) => s[Math.min(Math.floor(s.length * p), s.length - 1)];
    return {
        avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        min: s[0],
        max: s[s.length - 1],
        p50: pct(0.50),
        p95: pct(0.95),
        p99: pct(0.99),
    };
}

const ms = v => v == null ? 'N/A' : `${v} ms`;

// ─────────────────────────────────────────────
//  REPORT GENERATION
// ─────────────────────────────────────────────
function buildReport(testDurationMs) {
    const successful = allResults.filter(r => r.status === 'success');
    const failed = allResults.filter(r => r.status === 'failed');

    const loginTimes = successful.filter(r => r.loginEndMs && r.loginStartMs)
        .map(r => r.loginEndMs - r.loginStartMs);
    const viewerTimes = successful.filter(r => r.viewerEndMs && r.viewerStartMs)
        .map(r => r.viewerEndMs - r.viewerStartMs);
    const totalTimes = successful.filter(r => r.wallEndMs && r.wallStartMs)
        .map(r => r.wallEndMs - r.wallStartMs);

    // Error breakdown: group by first line of error message
    const errorMap = {};
    failed.forEach(r => {
        const key = (r.errorMessage || 'Unknown').substring(0, 100);
        errorMap[key] = (errorMap[key] || 0) + 1;
    });

    return {
        meta: {
            timestamp: new Date().toISOString(),
            totalUsers: CONFIG.TOTAL_USERS,
            concurrency: CONFIG.CONCURRENCY,
            browserCount: CONFIG.BROWSER_COUNT,
            readingTimeSec: CONFIG.READING_TIME_MS / 1000,
            testDurationMs,
            testDurationSec: Math.round(testDurationMs / 1000),
        },
        summary: {
            successful: successful.length,
            failed: failed.length,
            successRate: `${((successful.length / CONFIG.TOTAL_USERS) * 100).toFixed(2)}%`,
            throughputRPS: parseFloat((CONFIG.TOTAL_USERS / (testDurationMs / 1000)).toFixed(3)),
        },
        loginPerf: stats(loginTimes),
        viewerPerf: stats(viewerTimes),
        totalPerf: stats(totalTimes),
        errorBreakdown: errorMap,
    };
}

function saveResults(report) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');

    // JSON report
    const jsonPath = path.join(CONFIG.OUTPUT_DIR, `report-${ts}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // CSV raw data
    const csvPath = path.join(CONFIG.OUTPUT_DIR, `raw-${ts}.csv`);
    const header = [
        'userId', 'status',
        'loginDurationMs', 'viewerLoadDurationMs', 'totalDurationMs',
        'errorMessage',
    ].join(',');
    const rows = allResults.map(r => [
        r.userId,
        r.status,
        r.loginEndMs && r.loginStartMs ? r.loginEndMs - r.loginStartMs : '',
        r.viewerEndMs && r.viewerStartMs ? r.viewerEndMs - r.viewerStartMs : '',
        r.wallEndMs && r.wallStartMs ? r.wallEndMs - r.wallStartMs : '',
        `"${(r.errorMessage || '').replace(/"/g, "'")}"`,
    ].join(','));
    fs.writeFileSync(csvPath, [header, ...rows].join('\n'));

    return { jsonPath, csvPath };
}

function printReport(report, jsonPath, csvPath) {
    const { meta, summary, loginPerf, viewerPerf, totalPerf, errorBreakdown } = report;
    const sep = '─'.repeat(62);

    console.log(`\n\n${'═'.repeat(62)}`);
    console.log('  📊  LOAD TEST — FINAL REPORT');
    console.log(`${'═'.repeat(62)}`);

    console.log(`\n  ⚙️  TEST CONFIGURATION`);
    console.log(sep);
    console.log(`  Total Users   : ${meta.totalUsers}`);
    console.log(`  Concurrency   : ${meta.concurrency} simultaneous tabs`);
    console.log(`  Browsers      : ${meta.browserCount} Chromium instances`);
    console.log(`  Reading Time  : ${meta.readingTimeSec}s per user`);
    console.log(`  Test Duration : ${meta.testDurationSec}s  (${(meta.testDurationSec / 60).toFixed(1)} min)`);

    console.log(`\n  ✅  RESULTS SUMMARY`);
    console.log(sep);
    console.log(`  Successful    : ${summary.successful}  /  ${meta.totalUsers}`);
    console.log(`  Failed        : ${summary.failed}`);
    console.log(`  Success Rate  : ${summary.successRate}`);
    console.log(`  Throughput    : ${summary.throughputRPS} users/sec`);

    console.log(`\n  🔐  LOGIN PERFORMANCE  (successful users only)`);
    console.log(sep);
    console.log(`  Avg  ${ms(loginPerf.avg).padEnd(12)} Min  ${ms(loginPerf.min).padEnd(12)} Max  ${ms(loginPerf.max)}`);
    console.log(`  P50  ${ms(loginPerf.p50).padEnd(12)} P95  ${ms(loginPerf.p95).padEnd(12)} P99  ${ms(loginPerf.p99)}`);

    console.log(`\n  🖥️   DICOM VIEWER LOAD PERFORMANCE`);
    console.log(sep);
    console.log(`  Avg  ${ms(viewerPerf.avg).padEnd(12)} Min  ${ms(viewerPerf.min).padEnd(12)} Max  ${ms(viewerPerf.max)}`);
    console.log(`  P50  ${ms(viewerPerf.p50).padEnd(12)} P95  ${ms(viewerPerf.p95).padEnd(12)} P99  ${ms(viewerPerf.p99)}`);

    console.log(`\n  ⏱️   TOTAL SESSION DURATION`);
    console.log(sep);
    console.log(`  Avg  ${ms(totalPerf.avg).padEnd(12)} Min  ${ms(totalPerf.min).padEnd(12)} Max  ${ms(totalPerf.max)}`);
    console.log(`  P50  ${ms(totalPerf.p50).padEnd(12)} P95  ${ms(totalPerf.p95).padEnd(12)} P99  ${ms(totalPerf.p99)}`);

    if (Object.keys(errorBreakdown).length) {
        console.log(`\n  ❌  ERROR BREAKDOWN`);
        console.log(sep);
        Object.entries(errorBreakdown)
            .sort((a, b) => b[1] - a[1])
            .forEach(([msg, count]) => {
                console.log(`  [${String(count).padStart(3)}x]  ${msg}`);
            });
    } else {
        console.log('\n  🎉  Zero errors!');
    }

    console.log(`\n  📁  OUTPUT FILES`);
    console.log(sep);
    console.log(`  JSON Report : ${jsonPath}`);
    console.log(`  CSV Raw     : ${csvPath}`);
    console.log(`${'═'.repeat(62)}\n`);
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────
async function runLoadTest() {
    console.log(`${'═'.repeat(62)}`);
    console.log('  DICOM VIEWER LOAD TEST');
    console.log(`  ${CONFIG.TOTAL_USERS} users | ${CONFIG.CONCURRENCY} concurrent | ${CONFIG.BROWSER_COUNT} browsers`);
    console.log(`${'═'.repeat(62)}`);

    // Warn if config looks dangerous for the server
    if (CONFIG.CONCURRENCY > 60) {
        console.warn('\n  ⚠️  WARNING: CONCURRENCY > 60 may exhaust RAM on a 10-core server.');
        console.warn('     Recommended: 30–50 for your Xeon E5-2680 setup.\n');
    }

    const pool = new BrowserPool();
    await pool.init(CONFIG.BROWSER_COUNT);

    const sem = new Semaphore(CONFIG.CONCURRENCY);
    const testStart = Date.now();
    const promises = [];

    console.log(`\n  Spawning ${CONFIG.TOTAL_USERS} virtual users (${CONFIG.STAGGER_MS} ms stagger)…\n`);

    for (let i = 1; i <= CONFIG.TOTAL_USERS; i++) {
        promises.push(simulateUser(pool.next(), i, sem));
        if (CONFIG.STAGGER_MS > 0) {
            await new Promise(r => setTimeout(r, CONFIG.STAGGER_MS));
        }
    }

    await Promise.all(promises);

    const testDurationMs = Date.now() - testStart;
    const report = buildReport(testDurationMs);
    const { jsonPath, csvPath } = saveResults(report);

    printReport(report, jsonPath, csvPath);

    await pool.closeAll();
}

runLoadTest().catch(err => {
    console.error('\n  FATAL:', err);
    process.exit(1);
});
