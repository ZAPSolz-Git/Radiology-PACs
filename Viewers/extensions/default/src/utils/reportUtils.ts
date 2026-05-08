
/**
 * Generates a TipTap-compatible clinical header for radiology reports.
 * Used for synching patient details from the viewer to the report.
 * 
 * NOTE: This version is adapted for simple string/any inputs to avoid strict type dependency in Viewer extension.
 */
export const generateReportHeaderHtml = (caseData: any, doctorName: string): string => {
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

/**
 * Resolves a URL to a full backend URL if it is a relative path.
 */
export const getImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  const configBackend = (window as any).config?.backendUrl;
  const apiBase = configBackend 
    ? configBackend.replace(/\/api\/?$/, '') 
    : (window.location.hostname.includes('armorray') ? 'https://api.armorray.com' : 'http://localhost:5000');
  
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Safely fetches an image and returns a Buffer/Uint8Array.
 * If fetch fails, returns a 1x1 transparent PNG to prevent export crashes.
 */
export const getSafeImageBuffer = async (src: string): Promise<Uint8Array> => {
    try {
        if (src.startsWith('data:')) {
            const base64 = src.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }

        const resolvedUrl = getImageUrl(src);
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
        console.error('[reportUtils] Image fetch failed, using fallback:', src, error);
        // 1x1 transparent PNG fallback
        const fallbackBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        const binaryString = atob(fallbackBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
};
