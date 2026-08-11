import { HistoryTemplate } from '../types/technician';

export const HISTORY_TEMPLATES: HistoryTemplate[] = [
    {
        id: 'gen-1',
        title: 'Routine Check-up',
        content: 'Patient referred for routine imaging evaluation.',
        modality: 'General'
    },
    {
        id: 'gen-2',
        title: 'Pain Evaluation',
        content: 'Patient presents with pain in the concerned region.',
        modality: 'General'
    },
    {
        id: 'ct-1',
        title: 'CT Brain -- Stroke',
        content: 'Sudden onset weakness / altered sensorium. Rule out stroke.',
        modality: 'CT'
    },
    {
        id: 'ct-2',
        title: 'CT Brain -- Head Injury',
        content: 'History of trauma. Loss of consciousness / vomiting.',
        modality: 'CT'
    },
    {
        id: 'ct-3',
        title: 'CT Chest',
        content: 'Cough, breathlessness, fever. Rule out lung pathology.',
        modality: 'CT'
    },
    {
        id: 'ct-4',
        title: 'CT Abdomen',
        content: 'Abdominal pain. Rule out intra-abdominal pathology.',
        modality: 'CT'
    },
    {
        id: 'mri-1',
        title: 'MRI Brain',
        content: 'Headache / seizures / neurological symptoms.',
        modality: 'MRI'
    },
    {
        id: 'mri-2',
        title: 'MRI Spine',
        content: 'Back pain with or without radiculopathy.',
        modality: 'MRI'
    },
    {
        id: 'mri-3',
        title: 'MRI Knee',
        content: 'Knee pain following trauma / chronic pain.',
        modality: 'MRI'
    },
    {
        id: 'xray-1',
        title: 'X-Ray Chest',
        content: 'Fever / cough / pre-operative evaluation.',
        modality: 'X-Ray'
    },
    {
        id: 'xray-2',
        title: 'X-Ray Limb',
        content: 'Pain or swelling following trauma.',
        modality: 'X-Ray'
    },
    {
        id: 'nad',
        title: 'No Significant History (NAD)',
        content: 'No relevant clinical history provided.',
        modality: 'General'
    }
];
