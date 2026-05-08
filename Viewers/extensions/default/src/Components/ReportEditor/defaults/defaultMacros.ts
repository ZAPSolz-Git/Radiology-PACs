// defaultMacros.ts
// Used as fallback ONLY when RadiologistService.getMacros() returns empty [].
// These match the .key shortcut system in DocxEditor (type key + Space/Enter to expand).

export const DEFAULT_MACROS = [

    // ── GENERAL ──
    { key: '.tech', expansion: 'Study is technically adequate for interpretation.' },
    { key: '.techinq', expansion: 'Study is technically inadequate due to patient motion artifact. Clinical correlation advised.' },
    { key: '.nosabn', expansion: 'No significant abnormality detected.' },
    { key: '.clinco', expansion: 'Clinical correlation is advised.' },
    { key: '.fu', expansion: 'Follow-up imaging recommended as clinically indicated.' },
    { key: '.urgent', expansion: '⚠️ URGENT: Findings require immediate clinical attention. Please contact the referring physician.' },

    // ── CT BRAIN (Non-Contrast) ──
    {
        key: '.ctnormal',
        expansion: 'Gray-white matter differentiation is well maintained. No evidence of intracranial hemorrhage, mass effect, or midline shift. Ventricular system is normal in size and configuration. Basal cisterns are patent. No focal hypo/hyperdensities identified. Visualized paranasal sinuses and mastoid air cells are clear. Calvarium appears intact.'
    },
    {
        key: '.ctimp',
        expansion: 'No acute intracranial abnormality detected.\nNormal non-contrast CT brain.'
    },

    // ── CT CHEST ──
    {
        key: '.ctchestnormal',
        expansion: 'Both lungs are well expanded. No focal consolidation, ground-glass opacity, or suspicious pulmonary nodules identified. Trachea and major bronchi are patent. No pleural effusion or pneumothorax seen. Mediastinal structures are within normal limits. No mediastinal or hilar lymphadenopathy. Visualized bony thorax appears unremarkable.'
    },
    {
        key: '.ctchestimp',
        expansion: 'No significant abnormality detected in the chest on CT.'
    },

    // ── CT ABDOMEN & PELVIS ──
    {
        key: '.ctabdnormal',
        expansion: 'Liver is normal in size and attenuation with no focal lesion. Gallbladder is well distended with no calculi. Pancreas, spleen, and adrenal glands appear normal. Both kidneys show normal size, shape, and contrast excretion with no evidence of calculus or hydronephrosis. Bowel loops are unremarkable. No free fluid or free air seen. Visualized bones show no acute abnormality.'
    },
    {
        key: '.ctabdimp',
        expansion: 'No significant abnormality detected in the abdomen and pelvis.'
    },

    // ── MRI BRAIN ──
    {
        key: '.mribnormal',
        expansion: 'No focal signal abnormality identified on T1, T2, or FLAIR sequences. No restricted diffusion on DWI. No abnormal enhancement seen post-contrast. Ventricles and sulci appear normal for age. Corpus callosum is intact. Posterior fossa structures are unremarkable.'
    },
    {
        key: '.mribimp',
        expansion: 'Normal MRI brain. No acute intracranial pathology identified.'
    },

    // ── MRI SPINE ──
    {
        key: '.mrispnormal',
        expansion: 'Vertebral body heights and alignment are maintained. Intervertebral disc signal intensity is normal. No significant disc herniation, canal stenosis, or neural foraminal narrowing identified. Spinal cord/cauda equina shows normal signal. Paraspinal soft tissues are unremarkable.'
    },
    {
        key: '.mrispimp',
        expansion: 'No significant abnormality detected in the spine on MRI.'
    },

    // ── USG ABDOMEN ──
    {
        key: '.usgnormal',
        expansion: 'Liver is normal in size, shape, and echogenicity with no focal lesion. Gallbladder is normal with no calculi or wall thickening. Common bile duct is not dilated. Pancreas appears normal. Spleen is normal in size and echotexture. Both kidneys are normal in size, cortical echogenicity, and CMD. No hydronephrosis or calculus seen. No free fluid in the abdomen.'
    },
    {
        key: '.usgimp',
        expansion: 'No significant abnormality detected on abdominal ultrasound.'
    },

    // ── X-RAY CHEST ──
    {
        key: '.cxrnormal',
        expansion: 'Lung fields are clear with no focal consolidation, pleural effusion, or pneumothorax. Heart size is within normal limits. Mediastinal contours are normal. Trachea is central. Costophrenic angles are clear. Bony thorax and soft tissues are unremarkable.'
    },
    {
        key: '.cxrimp',
        expansion: 'Normal chest X-ray.'
    },
];