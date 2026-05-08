import { z } from 'zod';

export const createPatientSchema = z.object({
    name: z.string().min(1, 'Patient name is required'),
    age: z.number().int().positive('Age must be a positive integer').or(z.string().regex(/^\d+$/).transform(Number)),
    gender: z.enum(['Male', 'Female', 'Other'], {
        errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }),
    }),
    contactNumber: z.string().optional(),
    medicalHistory: z.string().optional(),
});
