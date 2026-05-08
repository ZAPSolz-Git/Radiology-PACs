// defaultReportTemplate.ts
// Returns a TipTap JSON string to pre-fill the editor when a case has NO existing report.
// studyType is matched from caseData.studyType or caseData.modality (case-insensitive).

interface TemplateOptions {
    patientName?: string;
    studyType?: string;   // e.g. "CT Brain", "MRI Spine", "USG Abdomen", "X-Ray Chest"
    modality?: string;    // fallback e.g. "CT", "MRI", "USG", "XR"
    date?: string;
}

// ─── TipTap node builders ─────────────────────────────────────────────────────

const p = (text = ''): any => ({
    type: 'paragraph',
    ...(text ? { content: [{ type: 'text', text }] } : {}),
});

const pBold = (text: string): any => ({
    type: 'paragraph',
    content: [{ type: 'text', text, marks: [{ type: 'bold' }] }],
});

const h2 = (text: string): any => ({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text }],
});

const h3 = (text: string): any => ({
    type: 'heading',
    attrs: { level: 3 },
    content: [{ type: 'text', text }],
});

// ─── Shared blocks ────────────────────────────────────────────────────────────

const sharedHeader = (patientName: string, studyLabel: string, date: string) => [
    p(`Dear [Referring Doctor],`),
    p(),
    p(`Please find below the radiology report for your patient.`),
    p(),
    h3('▸ Patient Details'),
    p(`Name: ${patientName}   |   Age / Sex: [Age] / [Sex]`),
    p(`Study: ${studyLabel}   |   Date: ${date}   |   Ref. By: [Doctor Name]`),
    p(),
    h3('▸ Clinical History'),
    p('[Enter clinical history / indication for the study]'),
    p(),
];

const sharedFooter = () => [
    p(),
    p('Regards,'),
    p('[Radiologist Name]'),
    p('[Designation]'),
    p('[Date]'),
];

// ─── Per-modality findings blocks ─────────────────────────────────────────────

const CT_BRAIN_FINDINGS = [
    h3('▸ Technique'),
    p('Non-contrast axial CT sections of the brain were obtained.'),
    p(),
    h3('▸ Findings'),
    pBold('Brain Parenchyma:'),
    p('[Gray-white matter differentiation / focal lesion / bleed]'),
    pBold('Ventricles & Cisterns:'),
    p('[Ventricular size / midline shift / basal cisterns]'),
    pBold('Extra-Axial Spaces:'),
    p('[Subdural / epidural / subarachnoid space]'),
    pBold('Paranasal Sinuses & Mastoids:'),
    p('[Clear / opacified]'),
    pBold('Calvarium & Soft Tissues:'),
    p('[Intact / fracture / swelling]'),
    p(),
    h3('▸ Impression'),
    p('[No acute intracranial abnormality detected. / Describe findings]'),
];

const CT_CHEST_FINDINGS = [
    h3('▸ Technique'),
    p('HRCT / Contrast-enhanced CT sections of the chest were obtained.'),
    p(),
    h3('▸ Findings'),
    pBold('Lungs:'),
    p('[Consolidation / GGO / nodules / emphysema]'),
    pBold('Airways:'),
    p('[Trachea / bronchi patent or narrowed]'),
    pBold('Pleura:'),
    p('[Effusion / pneumothorax / thickening]'),
    pBold('Mediastinum:'),
    p('[Lymphadenopathy / mediastinal widening]'),
    pBold('Heart & Great Vessels:'),
    p('[Cardiomegaly / pericardial effusion / aorta]'),
    pBold('Bones:'),
    p('[Bony thorax / spine — fracture / lytic lesion]'),
    p(),
    h3('▸ Impression'),
    p('[No significant abnormality detected in the chest on CT. / Describe findings]'),
];

const CT_ABD_FINDINGS = [
    h3('▸ Technique'),
    p('Contrast-enhanced CT sections of the abdomen and pelvis were obtained.'),
    p(),
    h3('▸ Findings'),
    pBold('Liver:'), p('[Size / echotexture / focal lesion]'),
    pBold('Gallbladder:'), p('[Calculi / wall thickening / CBD diameter]'),
    pBold('Pancreas:'), p('[Size / signal / ductal dilatation]'),
    pBold('Spleen:'), p('[Size / focal lesion]'),
    pBold('Adrenals:'), p('[Normal / nodule]'),
    pBold('Kidneys (B/L):'),
    p('[Size / cortical thickness / calculus / hydronephrosis / enhancement]'),
    pBold('Bowel Loops:'), p('[Unremarkable / dilatation / wall thickening]'),
    pBold('Lymph Nodes:'), p('[No significant lymphadenopathy / enlarged nodes]'),
    pBold('Free Fluid / Free Air:'), p('[Absent / present]'),
    pBold('Bones:'), p('[No acute bony abnormality]'),
    p(),
    h3('▸ Impression'),
    p('[No significant abnormality detected in the abdomen and pelvis. / Describe findings]'),
];

const MRI_BRAIN_FINDINGS = [
    h3('▸ Technique'),
    p('MRI brain performed with T1, T2, FLAIR, DWI sequences. Post-contrast T1 obtained.'),
    p(),
    h3('▸ Findings'),
    pBold('T2 / FLAIR:'), p('[Signal abnormality / white matter changes]'),
    pBold('DWI / ADC:'), p('[Restricted diffusion — acute infarct?]'),
    pBold('T1 Post-Contrast:'), p('[Enhancement / ring-enhancing lesion]'),
    pBold('Ventricles:'), p('[Size / configuration / hydrocephalus]'),
    pBold('Posterior Fossa:'), p('[Cerebellum / brainstem — normal / abnormal]'),
    pBold('Extra-Axial:'), p('[Meninges / subdural / subarachnoid]'),
    pBold('Calvarium:'), p('[Intact / lesion]'),
    p(),
    h3('▸ Impression'),
    p('[Normal MRI brain. / No acute intracranial pathology identified. / Describe findings]'),
];

const MRI_SPINE_FINDINGS = [
    h3('▸ Technique'),
    p('MRI [Cervical / Thoracic / Lumbar] spine performed with T1 and T2 sequences in sagittal and axial planes.'),
    p(),
    h3('▸ Findings'),
    pBold('Alignment:'), p('[Maintained / scoliosis / kyphosis]'),
    pBold('Vertebral Bodies:'), p('[Heights maintained / compression / signal change]'),
    pBold('Intervertebral Discs:'),
    p('[Normal / desiccation / prolapse at level ___]'),
    pBold('Spinal Canal:'), p('[Adequate / stenosis at level ___]'),
    pBold('Cord / Cauda Equina:'), p('[Normal signal / myelopathy]'),
    pBold('Neural Foramina:'), p('[Patent / narrowed at ___]'),
    pBold('Paraspinal Tissues:'), p('[Unremarkable / collection / mass]'),
    p(),
    h3('▸ Impression'),
    p('[No significant abnormality detected. / Describe disc prolapse / stenosis level]'),
];

const USG_ABD_FINDINGS = [
    h3('▸ Technique'),
    p('Ultrasound of the abdomen performed with a real-time B-mode scanner.'),
    p(),
    h3('▸ Findings'),
    pBold('Liver:'), p('[Size / echogenicity / focal lesion]'),
    pBold('Gallbladder:'), p('[Calculi / sludge / wall / CBD __ mm]'),
    pBold('Pancreas:'), p('[Visualized / not visualized / ductal dilatation]'),
    pBold('Spleen:'), p('[Size / echotexture]'),
    pBold('Right Kidney:'), p('[Size / CMD / calculus / hydronephrosis]'),
    pBold('Left Kidney:'), p('[Size / CMD / calculus / hydronephrosis]'),
    pBold('Urinary Bladder:'), p('[Adequately filled / wall / residual urine]'),
    pBold('Free Fluid:'), p('[Absent / trace / present in ___ region]'),
    p(),
    h3('▸ Impression'),
    p('[No significant abnormality detected on abdominal ultrasound. / Describe findings]'),
];

const CXR_FINDINGS = [
    h3('▸ Technique'),
    p('PA / AP view chest X-ray obtained.'),
    p(),
    h3('▸ Findings'),
    pBold('Lung Fields:'), p('[Clear / consolidation / opacity / nodule]'),
    pBold('Heart:'), p('[Size normal / cardiomegaly — CTR ___]'),
    pBold('Mediastinum:'), p('[Normal contour / widening / trachea central]'),
    pBold('Pleura:'), p('[Costophrenic angles clear / effusion / pneumothorax]'),
    pBold('Bones:'), p('[Ribs / spine — no acute fracture]'),
    pBold('Soft Tissues:'), p('[Unremarkable]'),
    p(),
    h3('▸ Impression'),
    p('[Normal chest X-ray. / Describe findings]'),
];

// ─── Study type detector ──────────────────────────────────────────────────────

type FindingsBlock = any[];

function detectFindings(studyType = '', modality = ''): { label: string; findings: FindingsBlock } {
    const s = (studyType + ' ' + modality).toLowerCase();

    if (s.includes('brain') && (s.includes('mri') || s.includes('mr')))
        return { label: 'MRI Brain', findings: MRI_BRAIN_FINDINGS };

    if (s.includes('spine') || s.includes('cervical') || s.includes('lumbar') || s.includes('thoracic'))
        return { label: 'MRI Spine', findings: MRI_SPINE_FINDINGS };

    if ((s.includes('ct') || s.includes('ncct')) && s.includes('brain'))
        return { label: 'Non-Contrast CT Brain', findings: CT_BRAIN_FINDINGS };

    if (s.includes('ct') && (s.includes('chest') || s.includes('thorax') || s.includes('hrct')))
        return { label: 'CT Chest', findings: CT_CHEST_FINDINGS };

    if (s.includes('ct') && (s.includes('abd') || s.includes('pelv') || s.includes('ap')))
        return { label: 'CT Abdomen & Pelvis', findings: CT_ABD_FINDINGS };

    if (s.includes('usg') || s.includes('ultrasound') || s.includes('sono'))
        return { label: 'USG Abdomen', findings: USG_ABD_FINDINGS };

    if (s.includes('xr') || s.includes('x-ray') || s.includes('chest') || s.includes('cxr'))
        return { label: 'X-Ray Chest', findings: CXR_FINDINGS };

    // Generic fallback
    return {
        label: studyType || modality || 'Radiology Study',
        findings: [
            h3('▸ Technique'),
            p('[Describe technique]'),
            p(),
            h3('▸ Findings'),
            p('[Enter findings here]'),
            p(),
            h3('▸ Impression'),
            p('[Enter impression]'),
        ],
    };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getDefaultReportTemplate(options: TemplateOptions = {}): string {
    const {
        patientName = '[Patient Name]',
        studyType = '',
        modality = '',
        date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    } = options;

    const { label, findings } = detectFindings(studyType, modality);

    const doc = {
        type: 'doc',
        content: [
            ...sharedHeader(patientName, label, date),
            ...findings,
            ...sharedFooter(),
        ],
    };

    return JSON.stringify(doc);
}