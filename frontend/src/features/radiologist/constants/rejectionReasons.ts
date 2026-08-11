import { RejectionReason } from '../types';

export const REJECTION_REASONS: RejectionReason[] = [
    { id: 'tu-1', label: 'Motion Artifacts (Blurry)', category: 'Technically-Unsound' },
    { id: 'tu-2', label: 'Missing Key Series/Planes', category: 'Technically-Unsound' },
    { id: 'tu-3', label: 'Poor Contrast Opacification', category: 'Technically-Unsound' },
    { id: 'pd-1', label: 'Wrong Patient ID/Name', category: 'Patient-Data-Error' },
    { id: 'pd-2', label: 'Age/Sex Mismatch in Header', category: 'Patient-Data-Error' },
    { id: 'cm-1', label: 'History Doesn\'t Match Study', category: 'Clinical-Mismatch' },
    { id: 'cm-2', label: 'Wrong Body Part Scanned', category: 'Clinical-Mismatch' }
];
