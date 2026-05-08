/**
 * Test Script: Send DICOM files to remote SCP on port 4243
 * 
 * Calling AE Title: TESTINGFROMLOCAL  (must match Site.scpAETitle in MongoDB)
 * Called AE Title:  NIVA09
 * Destination:      157.20.172.200:4243
 * 
 * Usage: node test-pacs-send.mjs
 */

import dcmjsDimse from "dcmjs-dimse";
import fs from "fs";
import path from "path";

const { Client } = dcmjsDimse;
const { CStoreRequest } = dcmjsDimse.requests;
const { Status, PresentationContextResult, SopClass, TransferSyntax } = dcmjsDimse.constants;

// ─── Configuration ─────────────────────────────────────────────────────────────
const CALLING_AE_TITLE = "TESTINGFROMLOCAL";   // Our identity → must match Site.scpAETitle
const CALLED_AE_TITLE = "ARMORRAY01";             // Destination AE title (SCP accepts any)
const DEST_HOST = "157.20.172.200";
const DEST_PORT = 4243;

// Use the smaller 10-file series for a quick test
const DICOM_DIR = "C:\\Users\\admin\\Desktop\\Varun\\conference\\(KASINATHAN  69Y  M) LOWER LIMB\\53450605";

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    // 1. Collect DICOM files
    const files = fs.readdirSync(DICOM_DIR)
        .filter(f => f.endsWith('.dcm'))
        .map(f => path.join(DICOM_DIR, f));

    console.log(`\n📁 Found ${files.length} DICOM files in: ${DICOM_DIR}`);
    console.log(`\n🔧 Connection Details:`);
    console.log(`   Calling AE Title : ${CALLING_AE_TITLE}`);
    console.log(`   Called AE Title  : ${CALLED_AE_TITLE}`);
    console.log(`   Destination      : ${DEST_HOST}:${DEST_PORT}`);
    console.log(`\n🚀 Starting C-STORE transmission...\n`);

    // 2. Create DICOM client
    const client = new Client();

    // 3. Add C-STORE requests for each file
    let successCount = 0;
    let failCount = 0;

    for (const filePath of files) {
        const request = new CStoreRequest(filePath);

        request.on('response', (response) => {
            if (response.getStatus() === Status.Success) {
                successCount++;
                console.log(`   ✅ [${successCount}/${files.length}] Sent: ${path.basename(filePath)}`);
            } else {
                failCount++;
                console.log(`   ❌ Failed: ${path.basename(filePath)} — Status: ${response.getStatus()}`);
            }
        });

        client.addRequest(request);
    }

    // 4. Handle client events
    client.on('associationAccepted', (association) => {
        console.log(`✅ Association ACCEPTED by ${DEST_HOST}:${DEST_PORT}`);
    });

    client.on('associationRejected', (result) => {
        console.log(`❌ Association REJECTED:`, JSON.stringify(result));
    });

    client.on('networkError', (e) => {
        console.error(`❌ Network Error: ${e.message}`);
    });

    client.on('closed', () => {
        console.log(`\n📊 Results:`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Failed:  ${failCount}`);
        console.log(`   Total:   ${files.length}`);

        if (successCount === files.length) {
            console.log(`\n🎉 All files sent successfully!`);
            console.log(`⏳ Wait ~30 seconds for the SCP's debounce timer, then check the technician's "PACS Received" tab.`);
        }
    });

    // 5. Send!
    try {
        await client.send(DEST_HOST, DEST_PORT, CALLING_AE_TITLE, CALLED_AE_TITLE);
    } catch (err) {
        console.error(`\n❌ Send failed: ${err.message}`);
        if (err.message.includes('ECONNREFUSED')) {
            console.error(`   → Port ${DEST_PORT} is not reachable. Check firewall or SCP status.`);
        }
    }
}

main();
