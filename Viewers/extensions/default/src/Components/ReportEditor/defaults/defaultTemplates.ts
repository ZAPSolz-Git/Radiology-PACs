// defaultTemplates.ts
// Standard radiology templates used as fallback when the API returns no templates.

export const DEFAULT_TEMPLATES = [
    {
        _id: 'tpl_ct_brain',
        title: 'Normal CT Brain (Non-Contrast)',
        modality: 'CT',
        bodyPart: 'Brain',
        description: 'Standard normal findings for non-contrast head CT.',
    },
    {
        _id: 'tpl_ct_chest',
        title: 'CT Chest (Plain / HRCT Pattern)',
        modality: 'CT',
        bodyPart: 'Chest',
        description: 'Standard HRCT chest findings template.',
    },
    {
        _id: 'tpl_ct_abd',
        title: 'CT Abdomen & Pelvis (Contrast Enhanced)',
        modality: 'CT',
        bodyPart: 'Abdomen & Pelvis',
        description: 'Comprehensive CECT abdomen and pelvis template.',
    },
    {
        _id: 'tpl_mri_brain',
        title: 'Normal MRI Brain',
        modality: 'MRI',
        bodyPart: 'Brain',
        description: 'Standard MRI brain sequences including DWI/ADC.',
    },
    {
        _id: 'tpl_mri_spine',
        title: 'MRI Spine (Degenerative/Disc)',
        modality: 'MRI',
        bodyPart: 'Spine',
        description: 'Template for cervical/lumbar disc disease.',
    },
    {
        _id: 'tpl_usg_abd',
        title: 'USG Abdomen (Full)',
        modality: 'USG',
        bodyPart: 'Abdomen',
        description: 'Complete abdominal ultrasound study template.',
    },
    {
        _id: 'tpl_cxr',
        title: 'Chest X-Ray (PA View)',
        modality: 'XR',
        bodyPart: 'Chest',
        description: 'Standard PA chest radiograph findings.',
    }
];
