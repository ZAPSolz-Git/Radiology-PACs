import Case from '../models/Case.js';
import logger from '../config/logger.js';
import axios from 'axios';
import { AI_CONFIG } from '../config/aiConfig.js';
import { getIO } from '../utils/socketSetup.js';

/**
 * Service to handle automated DICOM study integrity checks.
 * Phase 1: Metadata & Structural (Slice Continuity)
 */
class StudyIntegrityService {
    /**
     * Run full automated validation on a case
     * @param {string} caseId - MongoDB Case ID
     * @param {boolean} forceAI - Whether to trigger AI analysis regardless of AUTO_RUN setting
     */
    async runValidation(caseId, forceAI = false) {
        try {
            console.log(`[Integrity Debug] runValidation called for case: ${caseId} (forceAI: ${forceAI})`);
            const kase = await Case.findById(caseId);
            if (!kase) {
                console.error(`[Integrity Debug] Case NOT FOUND: ${caseId}`);
                throw new Error("Case not found for integrity check");
            }

            logger.info(`[Integrity] Starting validation for case: ${caseId}`);
            console.log(`[Integrity Debug] Current findings count: ${kase.integrityResults?.findings?.length || 0}`);

            const findings = [];
            let metadataScore = 100;
            let structuralScore = 100;

            // 1. Metadata Validation
            const metadataResults = this.validateMetadata(kase);
            findings.push(...metadataResults.findings);
            metadataScore = metadataResults.score;

            // 2. Structural Validation (Slice Continuity)
            const structuralResults = this.validateStructure(kase);
            findings.push(...structuralResults.findings);
            structuralScore = structuralResults.score;

            // 3. Overall Scoring
            // Metadata weighted 40%, Structural 60%
            const totalScore = Math.round((metadataScore * 0.4) + (structuralScore * 0.6));

            let status = 'Pass';
            if (totalScore < 70) status = 'Fail';
            else if (totalScore < 95 || findings.some(f => f.type === 'Warning')) status = 'Warning';

            // 4. Update Case
            kase.integrityResults = {
                score: totalScore,
                status: status,
                lastRun: new Date(),
                findings,
                metadataHealth: metadataScore,
                structuralHealth: structuralScore
            };

            await kase.save();
            console.log(`[Integrity Debug] Phase 1 complete. Saved with status: ${status}. Emitting to room: ${caseId.toString()}`);

            // 5. Notify client of Phase 1 results immediately
            try {
                const io = getIO();
                const roomId = caseId.toString();
                console.log(`[Integrity Debug] Socket IO retrieved. Transmitting to room ${roomId}...`);
                io.to(roomId).emit('integrity-update', {
                    caseId: roomId,
                    integrityResults: kase.integrityResults
                });
                console.log(`[Integrity Debug] Socket EMIT sent.`);
            } catch (ioErr) {
                console.error(`[Integrity Debug] Socket Error: ${ioErr.message}`);
                logger.warn(`[Integrity Socket Warning] Could not notify client: ${ioErr.message}`);
            }

            // 6. Trigger Modular AI Pixel Analysis (Phase 3)
            console.log(`[Integrity Debug] Checking AI trigger. AUTO_RUN: ${AI_CONFIG.AUTO_RUN}, forceAI: ${forceAI}`);
            if (AI_CONFIG.AUTO_RUN || forceAI) {
                console.log(`[Integrity Debug] Reaching triggerAIAnalysis (Manual or Auto triggered)...`);
                this.triggerAIAnalysis(kase).catch(err => {
                    console.error(`[Integrity Debug] AI Trigger Failed: ${err.message}`);
                    logger.error(`[AI Trigger Error] ${err.message}`);
                });
            } else {
                console.log(`[Integrity Debug] AI Trigger skipped (AUTO_RUN is false and forceAI is false)`);
            }

            return kase.integrityResults;
        } catch (error) {
            logger.error(`[Integrity Error] ${error.message}`);
            throw error;
        }
    }

    /**
     * Validates mandatory DICOM tags and data consistency
     */
    validateMetadata(kase) {
        const findings = [];
        let score = 100;
        const deduct = (amount, level, type, msg) => {
            score = Math.max(0, score - amount);
            findings.push({ level, type, message: msg });
        };

        // Check for essential study-level tags
        if (!kase.patientName) deduct(20, 'Metadata', 'Error', 'Missing Patient Name');
        if (!kase.patientId) deduct(20, 'Metadata', 'Error', 'Missing Patient ID / MRN');
        if (!kase.modality) deduct(10, 'Metadata', 'Warning', 'Missing Modality tag');
        if (!kase.studyInstanceUID) deduct(30, 'Metadata', 'Error', 'Missing Study Instance UID (Non-compliant DICOM)');

        // Check individual file metadata health
        const filesWithIssues = kase.dicomFiles.filter(f => !f.sopInstanceUID || f.sopInstanceUID.startsWith('FALLBACK'));
        if (filesWithIssues.length > 0) {
            const percent = Math.round((filesWithIssues.length / kase.dicomFiles.length) * 100);
            const deduction = Math.min(40, percent);
            score = Math.max(0, score - deduction);

            findings.push({
                level: 'Metadata',
                type: 'Warning',
                message: `${percent}% of frames missing standard SOP UIDs. Viewer performance may be degraded.`,
                details: {
                    problematicFrames: filesWithIssues.slice(0, 20).map(f => ({
                        name: f.name,
                        path: f.path,
                        series: f.seriesDescription || 'N/A'
                    })),
                    totalProblematic: filesWithIssues.length
                }
            });
        }

        return { score, findings };
    }

    /**
     * Validates slice continuity and geometry
     */
    validateStructure(kase) {
        const findings = [];
        let score = 100;

        // Group files by Series
        const seriesData = {};
        kase.dicomFiles.forEach(file => {
            const uid = file.seriesInstanceUID || 'unknown';
            if (!seriesData[uid]) seriesData[uid] = [];
            seriesData[uid].push(file);
        });

        // 1. Missing Series / Protocol Check
        const uniqueSeries = Object.keys(seriesData);
        const benchmarks = { 'BRAIN': 4, 'CHEST': 2, 'KNEE': 3, 'ABDOMEN': 2 };
        const bodyPartUpper = (kase.bodyPart || '').toUpperCase();
        const expectedCount = benchmarks[bodyPartUpper] || 1;

        if (uniqueSeries.length < expectedCount) {
            score = Math.max(0, score - 20);
            findings.push({
                level: 'Clinical',
                type: 'Warning',
                message: `Potential Missing Series. Expected at least ${expectedCount} series for ${kase.bodyPart || 'this study'}, found ${uniqueSeries.length}.`,
                details: { expected: expectedCount, found: uniqueSeries.length }
            });
        }

        // 2. Analyze each series for continuity (Existing Logic)

        // Analyze each series
        Object.keys(seriesData).forEach(uid => {
            const series = seriesData[uid];
            if (series.length < 2) return; // Can't check continuity on single image

            // Sort by Image Position (Z-axis)
            series.sort((a, b) => {
                const zA = a.imagePositionPatient?.[2] || 0;
                const zB = b.imagePositionPatient?.[2] || 0;
                return zA - zB;
            });

            // Calculate gaps
            let gapsFound = 0;
            for (let i = 1; i < series.length; i++) {
                const prev = series[i - 1];
                const curr = series[i];

                if (!prev.imagePositionPatient || !curr.imagePositionPatient) continue;

                const z1 = prev.imagePositionPatient[2];
                const z2 = curr.imagePositionPatient[2];
                const actualSpacing = Math.abs(z2 - z1);

                // Use slice thickness or average spacing to detect gaps
                const expectedSpacing = curr.sliceThickness || 0;

                // If gap is more than 1.5x expected, it's likely a missing slice
                if (expectedSpacing > 0 && actualSpacing > expectedSpacing * 1.5) {
                    gapsFound++;
                }
            }

            if (gapsFound > 0) {
                const seriesNum = series[0].seriesNumber || 'Unknown';
                const seriesDesc = series[0].seriesDescription || '';
                score = Math.max(0, score - (gapsFound * 10)); // Deduct per gap
                findings.push({
                    level: 'Structural',
                    type: 'Error',
                    message: `Gap detected in Series ${seriesNum} (${seriesDesc}). Found ${gapsFound} missing slice(s).`,
                    seriesInstanceUID: uid,
                    details: { gapsCount: gapsFound }
                });
            }
        });

        return { score, findings };
    }

    /**
     * Calls the standalone Python AI microservice for pixel-level analysis
     */
    async triggerAIAnalysis(kase) {
        try {
            const payload = {
                caseId: kase._id,
                modality: kase.modality,
                bodyPart: kase.bodyPart,
                filePaths: kase.dicomFiles.map(f => f.path),
                callbackUrl: AI_CONFIG.CALLBACK_URL
            };

            const url = AI_CONFIG.SERVICE_URL + AI_CONFIG.ANALYZE_ENDPOINT;
            console.log(`[Integrity Debug] Sending POST to AI Service: ${url}`);
            console.log(`[Integrity Debug] Payload:`, JSON.stringify(payload, null, 2));

            await axios.post(url, payload, {
                timeout: 5000 // Short timeout for the trigger (the work is async)
            });
            console.log(`[Integrity Debug] AI POST request sent successfully.`);

        } catch (error) {
            logger.error(`[AI Client Error] Failed to contact AI service: ${error.message}`);
            throw error;
        }
    }
}

export default new StudyIntegrityService();