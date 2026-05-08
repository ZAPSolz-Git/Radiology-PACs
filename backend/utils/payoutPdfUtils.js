import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';

/**
 * Generate a professional PDF invoice for Radiologist Payouts
 * @param {Object} payout - The payout document from MongoDB (populated with cases and radiologist)
 */
export async function generatePayoutPDF(payout) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // --- Colors & Styles ---
    const primaryColor = rgb(0.24, 0.28, 0.8); // Indigo-ish
    const secondaryColor = rgb(0.4, 0.4, 0.4);
    const borderColor = rgb(0.9, 0.9, 0.9);

    // --- Header Section ---
    page.drawRectangle({
        x: 0,
        y: height - 100,
        width: width,
        height: 100,
        color: rgb(0.98, 0.98, 1.0),
    });

    page.drawText("PAYOUT INVOICE", {
        x: 50,
        y: height - 60,
        size: 24,
        font: fontBold,
        color: primaryColor,
    });

    page.drawText("Radiology Services Portal", {
        x: width - 200,
        y: height - 50,
        size: 14,
        font: fontBold,
        color: primaryColor,
    });

    page.drawText("Trusted Diagnostic Network", {
        x: width - 200,
        y: height - 65,
        size: 10,
        font: fontRegular,
        color: secondaryColor,
    });

    // --- Payout Metadata ---
    let y = height - 130;

    // Left: Billing From
    page.drawText("From:", { x: 50, y: y, size: 10, font: fontBold });
    page.drawText("Radiology Network HQ", { x: 50, y: y - 15, size: 10, font: fontRegular });
    page.drawText("Corporate Financial Hub", { x: 50, y: y - 30, size: 10, font: fontRegular });
    page.drawText("Email: billing@radiologyportal.com", { x: 50, y: y - 45, size: 10, font: fontRegular });

    // Right: Payable To (Radiologist)
    page.drawText("Payable To:", { x: width / 2 + 50, y: y, size: 10, font: fontBold });
    page.drawText(`Dr. ${payout.radiologist?.name || 'Unknown Doctor'}`, { x: width / 2 + 50, y: y - 15, size: 10, font: fontRegular });
    page.drawText(payout.radiologist?.institution || 'Independent Radiologist', { x: width / 2 + 50, y: y - 30, size: 10, font: fontRegular });
    page.drawText(`Email: ${payout.radiologist?.email || 'N/A'}`, { x: width / 2 + 50, y: y - 45, size: 10, font: fontRegular });

    y -= 80;

    // Horizontal Line
    page.drawLine({
        start: { x: 50, y: y },
        end: { x: width - 50, y: y },
        thickness: 1,
        color: borderColor,
    });

    y -= 25;

    // Summary Row
    page.drawText(`Payout ID: ${payout._id.toString().substring(0, 8).toUpperCase()}`, { x: 50, y: y, size: 10, font: fontBold });
    page.drawText(`Period: ${payout.period}`, { x: width / 2 - 50, y: y, size: 10, font: fontRegular });
    page.drawText(`Generated: ${format(new Date(payout.createdAt), 'dd MMM yyyy')}`, { x: width - 180, y: y, size: 10, font: fontRegular });

    y -= 40;

    // --- Table Header ---
    page.drawRectangle({
        x: 50,
        y: y - 5,
        width: width - 100,
        height: 25,
        color: rgb(0.95, 0.95, 0.98),
    });

    const tableHeaderY = y + 5;
    page.drawText("DATE", { x: 60, y: tableHeaderY, size: 9, font: fontBold, color: secondaryColor });
    page.drawText("PATIENT NAME", { x: 130, y: tableHeaderY, size: 9, font: fontBold, color: secondaryColor });
    page.drawText("MODALITY", { x: 280, y: tableHeaderY, size: 9, font: fontBold, color: secondaryColor });
    page.drawText("URGENCY", { x: 380, y: tableHeaderY, size: 9, font: fontBold, color: secondaryColor });
    page.drawText("EARNING", { x: width - 110, y: tableHeaderY, size: 9, font: fontBold, color: secondaryColor });

    y -= 30;

    // --- Table Content ---
    for (const kase of payout.cases) {
        if (y < 80) { // Simple page break check
            page.drawText("... continued on next page (omitted in preview)", { x: width / 2 - 100, y: 50, size: 8, font: fontRegular, color: secondaryColor });
            break;
        }

        const studyDate = kase.studyDate ? format(new Date(kase.studyDate), 'dd/MM/yy') : 'N/A';
        const patientName = kase.patientName?.substring(0, 20) || 'N/A';
        const earning = kase.billingInfo?.radiologistEarning || 0;
        
        let modalityStr = kase.bodyPart ? `${kase.modality} - ${kase.bodyPart}` : (kase.modality || '-');
        if (modalityStr.length > 18) modalityStr = modalityStr.substring(0, 16) + '...';

        page.drawText(studyDate, { x: 60, y, size: 9, font: fontRegular });
        page.drawText(patientName, { x: 130, y, size: 9, font: fontRegular });
        page.drawText(modalityStr, { x: 280, y, size: 9, font: fontRegular });
        page.drawText(kase.urgency || 'Routine', { x: 380, y, size: 9, font: fontRegular, color: kase.urgency === 'STAT' ? rgb(1, 0, 0) : rgb(0, 0, 0) });
        page.drawText(`INR ${earning.toFixed(2)}`, { x: width - 110, y, size: 9, font: fontRegular });

        y -= 20;

        // Minor Row Line
        page.drawLine({
            start: { x: 50, y: y + 5 },
            end: { x: width - 50, y: y + 5 },
            thickness: 0.5,
            color: borderColor,
        });
    }

    // --- Footer Summary ---
    y = 150; // Pin summary to bottom-ish

    page.drawLine({
        start: { x: width - 250, y: y },
        end: { x: width - 50, y: y },
        thickness: 1,
        color: secondaryColor,
    });

    y -= 25;
    page.drawText("Total Cases Read:", { x: width - 230, y, size: 10, font: fontRegular });
    page.drawText(payout.caseCount.toString(), { x: width - 100, y, size: 10, font: fontBold });

    y -= 25;
    page.drawText("TOTAL PAYOUT:", { x: width - 230, y, size: 12, font: fontBold, color: primaryColor });
    page.drawText(`INR ${payout.amount.toFixed(2)}`, { x: width - 100, y, size: 12, font: fontBold, color: primaryColor });

    // Status Stamp
    const statusText = payout.status?.toUpperCase() || 'PENDING';
    const statusColor = payout.status === 'Paid' ? rgb(0.1, 0.7, 0.3) : rgb(0.8, 0.4, 0.1);

    page.drawRectangle({
        x: 50,
        y: 100,
        width: 120,
        height: 40,
        borderColor: statusColor,
        borderWidth: 2,
    });

    page.drawText(statusText, {
        x: 65,
        y: 115,
        size: 16,
        font: fontBold,
        color: statusColor,
        opacity: 0.6,
    });

    if (payout.paidAt) {
        page.drawText(`Paid On: ${format(new Date(payout.paidAt), 'dd/MM/yyyy')}`, {
            x: 50,
            y: 85,
            size: 9,
            font: fontRegular,
            color: secondaryColor
        });
    }

    // --- Bottom Disclaimer ---
    page.drawText("This is a computer generated document summarizing radiologist earnings. No signature required.", {
        x: width / 2 - 180,
        y: 30,
        size: 8,
        font: fontRegular,
        color: secondaryColor,
    });

    return await pdfDoc.save();
}
