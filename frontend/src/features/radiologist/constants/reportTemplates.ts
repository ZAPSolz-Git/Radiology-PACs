import { ReportTemplate, ReportMacro } from '../types';

export const DEFAULT_TEMPLATES: ReportTemplate[] = [
    {
        id: 't1',
        title: 'CT Brain - Normal',
        modality: 'CT',
        bodyPart: 'Brain',
        content: `
            <h3>FINDINGS:</h3>
            <p>The brain parenchyma shows normal attenuation. There is no evidence of intracranial hemorrhage, infarct or mass effect. The ventricles and cortical sulci are normal for age. The visualised paranasal sinuses and mastoid air cells are clear.</p>
            <h3>IMPRESSION:</h3>
            <p>Normal CT scan of the brain.</p>
        `
    },
    {
        id: 't2',
        title: 'MRI Knee - Routine',
        modality: 'MRI',
        bodyPart: 'Knee',
        content: `
            <h3>FINDINGS:</h3>
            <p>The cruciate and collateral ligaments are intact. No meniscal tear is seen. No significant joint effusion. The bones show normal marrow signal.</p>
            <h3>IMPRESSION:</h3>
            <p>No significant abnormality detected in the knee joint.</p>
        `
    }
];

export const REPORT_MACROS: ReportMacro[] = [
    { key: '.nad', expansion: 'No abnormality detected.' },
    { key: '.stroke', expansion: 'Sudden onset neurological deficit. Rule out stroke.' },
    { key: '.trauma', expansion: 'History of trauma. Evaluate for fractures and internal injury.' }
];
