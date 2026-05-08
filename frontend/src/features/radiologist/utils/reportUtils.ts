import { RadiologistCase } from '../types';

export const generateReportHeaderHtml = (caseData: RadiologistCase, doctorName: string): string => {
  const safe = (val: any) => (val ? String(val) : 'N/A');

  const formatStudyDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }) +
        ' · ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return dateStr;
    }
  };

  const dark = '#0d1b3e';
  const label = '#f0f4f9';
  const gold = '#c4a35a';

  // Title block rendered as <p> tags — sits above the table cleanly
  // because TipTap can't merge cells for a proper banner row.
  const titleBlock = `<p><span style="color: ${dark}"><strong>— DIAGNOSTIC RADIOLOGY REPORT —</strong></span></p>` +
    `<p><span style="color: ${gold}">Department of Radiology &amp; Imaging Sciences &nbsp;·&nbsp; Confidential Medical Record</span></p>`;

  const tableHtml =
    `<table><tbody>` +

    // Row 1 — Patient Name + Patient ID
    `<tr>` +
    `<td style="background-color: ${label}"><p><strong>Patient Name</strong></p></td>` +
    `<td><p>${safe(caseData.patientName)}</p></td>` +
    `<td style="background-color: ${label}"><p><strong>Patient ID</strong></p></td>` +
    `<td><p>${safe(caseData.patientId)}</p></td>` +
    `</tr>` +

    // Row 2 — Age / Gender + Study Date
    `<tr>` +
    `<td style="background-color: ${label}"><p><strong>Age / Gender</strong></p></td>` +
    `<td><p>${safe(caseData.age)} yrs | ${safe(caseData.gender)}</p></td>` +
    `<td style="background-color: ${label}"><p><strong>Study Date</strong></p></td>` +
    `<td><p>${formatStudyDate(safe(caseData.studyDate))}</p></td>` +
    `</tr>` +

    // Row 3 — Modality + Accession #
    `<tr>` +
    `<td style="background-color: ${label}"><p><strong>Modality</strong></p></td>` +
    `<td><p><strong>${safe(caseData.modality)}</strong></p></td>` +
    `<td style="background-color: ${label}"><p><strong>Accession #</strong></p></td>` +
    `<td><p>${safe(caseData.accessionNumber)}</p></td>` +
    `</tr>` +

    // Row 4 — Scan Description + Reporting MD
    `<tr>` +
    `<td style="background-color: ${label}"><p><strong>Scan Description</strong></p></td>` +
    `<td><p>${safe(caseData.studyDescription)}</p></td>` +
    `<td style="background-color: ${label}"><p><strong>Reporting MD</strong></p></td>` +
    `<td><p><strong><span style="color: ${dark}">Dr. ${doctorName}</span></strong></p></td>` +
    `</tr>` +

    `</tbody></table>`;

  return (
    titleBlock +
    `<p></p>` +
    tableHtml +
    `<p></p>` +
    `<h2>Clinical Findings</h2>` +
    `<p><em>Enter your diagnostic observations here...</em></p>`
  );
};