import fs from "fs";
import path from "path";
import Case from "../models/Case.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../constants/index.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../config/logger.js";
import { getIO } from "../utils/socketSetup.js";

/**
 * @desc    Get Radiologist Worklist (Assigned Cases)
 * @route   GET /api/radiologist/worklist
 * @access  Private (Radiologist)
 */
export const getWorklist = asyncHandler(async (req, res) => {
    const { status, priority } = req.query;

    const query = {
        assignedRadiologist: req.user._id,
        // Only show relevant statuses
        status: { $in: ['Assigned', 'In_Progress', 'Rep_Correction', 'QA_Audit', 'QA_Review', 'Rejected', 'Finalized'] }
    };

    if (priority) {
        query.urgency = priority;
    }

    const worklist = await Case.find(query)
        .populate("uploadedBy", "name")
        .populate("assignedRadiologist", "name")
        .populate("qaVerification.verifiedBy", "name")
        .sort({ urgency: -1, deadline: 1 }); // Urgent and overdue first

    return sendSuccess(res, HTTP_STATUS.OK, "Worklist retrieved", worklist);
});

/**
 * @desc    Save Report Draft
 * @route   POST /api/radiologist/:id/draft
 * @access  Private (Radiologist)
 */
export const saveReportDraft = asyncHandler(async (req, res) => {
    const { findings, impression, diagnosis, keyImages, measurements, jsonContent, banner } = req.body;
    const reportDoc = req.file;

    console.log(`[saveReportDraft] Recv for ${req.params.id}: hasDocx=${!!reportDoc}, hasJson=${!!jsonContent}, findings=${!!findings}, diagnosis=${!!diagnosis}`);
    console.log(`[saveReportDraft] req.body:`, req.body); // Added logging for req.body

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (kase.assignedRadiologist.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized to report on this case", HTTP_STATUS.FORBIDDEN);
    }

    let docxUrl = kase.report?.docxUrl;
    let docxPath = kase.report?.docxPath;

    // Handle DOCX upload
    if (reportDoc) {
        const studyDir = kase.studyDirectory || path.join("uploads", "cases", kase.studyInstanceUID);
        const reportDir = path.join(studyDir, "reports");
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        // Use original filename if provided (PatientName_ID.docx) or fallback to timestamp
        const fileName = reportDoc.originalname || `report_draft_${Date.now()}.docx`;
        const filePath = path.join(reportDir, fileName);
        fs.writeFileSync(filePath, reportDoc.buffer);

        docxPath = filePath;
        docxUrl = `/uploads/cases/${kase.studyInstanceUID}/reports/${fileName}`;
    }

    // Update Report Data
    kase.report = {
        ...kase.report,
        author: req.user._id,
        findings: findings !== undefined ? findings : kase.report?.findings,
        impression: impression !== undefined ? impression : kase.report?.impression,
        docxUrl,
        docxPath,
        diagnosis: diagnosis !== undefined ? diagnosis : kase.report?.diagnosis, // Conditional assignment for diagnosis
        keyImages: keyImages ? JSON.parse(keyImages) : kase.report?.keyImages,
        measurements: measurements ? JSON.parse(measurements) : kase.report?.measurements,
        jsonContent: jsonContent !== undefined ? jsonContent : kase.report?.jsonContent,
        banner: banner !== undefined ? banner : kase.report?.banner,
        status: 'Draft',
        version: (kase.report?.version || 0) + 1
    };

    // Update Status if first time opening
    if (kase.status === 'Assigned') {
        kase.status = 'In_Progress';
    }

    // Add timeline entry
    kase.addTimelineEntry(
        kase.report?.version > 1 ? 'Report Draft Updated' : 'Report Draft Saved',
        req.user,
        `Draft version ${kase.report.version} saved`,
        { version: kase.report.version, hasDocx: !!docxUrl }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    return sendSuccess(res, HTTP_STATUS.OK, "Draft saved successfully", kase);
});

/**
 * @desc    Submit Report to QA
 * @route   POST /api/radiologist/:id/submit
 * @access  Private (Radiologist)
 */
export const submitReport = asyncHandler(async (req, res) => {
    const { findings, impression, jsonContent, banner } = req.body;
    const reportDoc = req.file;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (kase.assignedRadiologist.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized to report on this case", HTTP_STATUS.FORBIDDEN);
    }

    let docxUrl = kase.report?.docxUrl;
    let docxPath = kase.report?.docxPath;

    // Handle DOCX upload
    if (reportDoc) {
        const studyDir = kase.studyDirectory || path.join("uploads", "cases", kase.studyInstanceUID);
        const reportDir = path.join(studyDir, "reports");
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

        // Use original filename if provided or fallback to timestamp
        const fileName = reportDoc.originalname || `report_final_${Date.now()}.docx`;
        const filePath = path.join(reportDir, fileName);
        fs.writeFileSync(filePath, reportDoc.buffer);

        docxPath = filePath;
        docxUrl = `/uploads/cases/${kase.studyInstanceUID}/reports/${fileName}`;
    }

    // Finalize content
    kase.report = {
        ...kase.report,
        author: req.user._id,
        findings,
        impression,
        docxUrl,
        docxPath,
        jsonContent: jsonContent || kase.report?.jsonContent,
        banner: (banner && banner !== 'undefined' && banner !== 'null') ? banner : kase.report?.banner,
        status: 'Submitted',
        submittedAt: new Date(),
        version: (kase.report?.version || 0) + 1
    };

    // Move to QA Review (as requested by user)
    kase.status = 'QA_Review';

    // Add to timeline
    kase.addTimelineEntry(
        'Report Submitted',
        req.user,
        `Report submitted for QA audit (version ${kase.report.version})`,
        { version: kase.report.version, hasDocx: !!docxUrl }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    logger.info(`[Report Submit] Case ${kase._id} reported by Dr. ${req.user.name}`);
    return sendSuccess(res, HTTP_STATUS.OK, "Report submitted to QA", kase);
});

/**
 * Shared helper: Convert the editor DOCX to professional report HTML
 * - Extracts images as inline base64
 * - Makes the first image (banner) full-width
 * - Makes the last image (signature) ~180px wide
 */
async function convertDocxToReportHtml(docxPath, { noBanner = false } = {}) {
    const mammoth = await import('mammoth');

    const result = await mammoth.convertToHtml({ path: docxPath }, {
        convertImage: mammoth.images.imgElement((image) => {
            return image.read("base64").then((imageBuffer) => ({
                src: `data:${image.contentType};base64,${imageBuffer}`
            }));
        })
    });

    let htmlBody = result.value;

    // Post-process images: banner (1st), signature (last), others
    let imgCount = 0;
    const totalImages = (htmlBody.match(/<img /g) || []).length;

    htmlBody = htmlBody.replace(/<p>\s*<img [^>]*>\s*<\/p>|<img /g, (match) => {
        imgCount++;
        if (imgCount === 1) {
            if (noBanner) {
                // Strip the entire banner paragraph
                if (match.startsWith('<p>')) return '';
                return '<!-- banner removed -->';
            }
            // Banner: full-width, no margins, centered
            if (match.startsWith('<p>')) {
                return match.replace(/<img /, '<img style="width:100%;max-width:100%;height:auto;display:block;margin:0 auto 12px auto;" ');
            }
            return '<img style="width:100%;max-width:100%;height:auto;display:block;margin:0 auto 12px auto;" ';
        } else if (imgCount === totalImages && totalImages > 1) {
            // Signature: small, left-aligned
            if (match.startsWith('<p>')) {
                return match.replace(/<img /, '<img style="width:180px;max-width:180px;height:auto;display:block;margin:16px 0 4px 0;" ');
            }
            return '<img style="width:180px;max-width:180px;height:auto;display:block;margin:16px 0 4px 0;" ';
        }
        // Other images: reasonable default
        if (match.startsWith('<p>')) {
            return match.replace(/<img /, '<img style="max-width:100%;height:auto;display:block;margin:8px 0;" ');
        }
        return '<img style="max-width:100%;height:auto;display:block;margin:8px 0;" ';
    });

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 20mm 18mm;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
  }
  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 10pt;
  }
  td, th {
    border: 1px solid #b0b0b0;
    padding: 7px 12px;
    vertical-align: middle;
    text-align: left;
  }
  th {
    background-color: #f0f4f8;
    font-weight: 700;
    color: #2d3748;
  }
  /* Headings */
  h1 { font-size: 18pt; font-weight: 800; margin: 18px 0 8px; color: #111; }
  h2 { font-size: 14pt; font-weight: 700; margin: 14px 0 6px; color: #1a1a1a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  h3 { font-size: 12pt; font-weight: 600; margin: 10px 0 4px; color: #2d3748; }
  /* Text */
  p { margin: 5px 0; }
  strong { font-weight: 700; }
  em { font-style: italic; color: #4a5568; }
  ul, ol { padding-left: 22px; margin: 6px 0; }
  li { margin: 3px 0; }
  /* Images (fallback — inline styles from post-processing take priority) */
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${htmlBody}
</body>
</html>`;

    return fullHtml;
}

export const downloadReport = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const { format = 'docx', noBanner } = req.query;

    const kase = await Case.findById(caseId);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (!kase.report || !kase.report.docxPath) {
        throw new AppError("Report not found for this case", HTTP_STATUS.NOT_FOUND);
    }

    const docxPath = kase.report.docxPath;

    if (!fs.existsSync(docxPath)) {
        throw new AppError("Report file not found on server", HTTP_STATUS.NOT_FOUND);
    }

    const patientName = kase.patient?.name || kase.patientName || 'Patient';
    const fileName = patientName.replace(/\s+/g, '_');

    // Generate professional report HTML (shared for both formats)
    const html = await convertDocxToReportHtml(docxPath, { noBanner: noBanner === 'true' });

    if (format === 'pdf') {
        let browser = null;
        try {
            const puppeteer = await import('puppeteer');

            browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 10000
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 10000 });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' }
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
            res.send(Buffer.from(pdfBuffer));

        } catch (error) {
            logger.error('Error converting report to PDF:', error);
            throw new AppError("Failed to convert report to PDF. Please download as DOCX.", HTTP_STATUS.INTERNAL_SERVER_ERROR);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    } else {
        try {
            const HTMLtoDOCX = (await import('html-to-docx')).default;

            const docxBuffer = await HTMLtoDOCX(html, null, {
                table: { row: { cantSplit: true } },
                footer: false,
                header: false,
                margins: { top: 720, right: 720, bottom: 720, left: 720 }
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}.docx"`);
            res.send(Buffer.from(docxBuffer));

        } catch (error) {
            logger.error('Error generating Word-compatible DOCX:', error);

            // Fallback: serve the raw file from disk
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}.docx"`);
            const fileStream = fs.createReadStream(docxPath);
            fileStream.pipe(res);
            fileStream.on('error', (e) => logger.error('Fallback stream error:', e));
        }
    }
});

/**
 * @desc    Accept Assigned Case
 * @route   PATCH /api/radiologist/:id/accept
 * @access  Private (Radiologist)
 */
export const acceptCase = asyncHandler(async (req, res) => {
    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (kase.assignedRadiologist?.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized to accept this case", HTTP_STATUS.FORBIDDEN);
    }

    if (kase.status !== 'Assigned') {
        throw new AppError(`Cannot accept case in ${kase.status} status`, HTTP_STATUS.BAD_REQUEST);
    }

    kase.status = 'In_Progress';

    // Add timeline entry
    kase.addTimelineEntry(
        'Case Accepted',
        req.user,
        'Radiologist accepted the assignment'
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    return sendSuccess(res, HTTP_STATUS.OK, "Case accepted successfully", kase);
});

/**
 * @desc    Reject Assigned Case
 * @route   PATCH /api/radiologist/:id/reject
 * @access  Private (Radiologist)
 */
export const rejectCase = asyncHandler(async (req, res) => {
    const { reason, comment } = req.body;

    const kase = await Case.findById(req.params.id);
    if (!kase) throw new AppError("Case not found", HTTP_STATUS.NOT_FOUND);

    if (kase.assignedRadiologist?.toString() !== req.user._id.toString()) {
        throw new AppError("Not authorized to reject this case", HTTP_STATUS.FORBIDDEN);
    }

    if (kase.status !== 'Assigned') {
        throw new AppError(`Cannot reject case in ${kase.status} status`, HTTP_STATUS.BAD_REQUEST);
    }

    // Move to Rep_Correction status so it appears in QA Queue with "Doctor Rejected" context
    kase.status = 'Rep_Correction';
    // Maintain assignment so it returns to the same doctor after fix
    kase.rejectionReason = `${reason}${comment ? ': ' + comment : ''}`;

    // Add timeline entry
    kase.addTimelineEntry(
        'Case Rejected by Doctor',
        req.user,
        `Reason: ${reason}. Comment: ${comment || ''}`,
        { reason, comment }
    );

    await kase.save();

    // Notify real-time
    const io = getIO();
    io.emit("case_updated", kase._id);

    // Mock Notification to QA
    logger.info(`[REJECTION] Case ${kase._id} rejected by Dr. ${req.user.name}. Returned to QA Queue.`);
    console.log(`[NOTIFY] Case rejected by Doctor. Returned to QA Queue.`);

    return sendSuccess(res, HTTP_STATUS.OK, "Case rejected and returned to QA", kase);
});
