import Patient from "../models/Patient.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { HTTP_STATUS } from "../constants/index.js";

/**
 * @desc    Get all patients or search by MRN/Name
 * @route   GET /api/patients
 * @access  Private
 */
export const getPatients = asyncHandler(async (req, res) => {
    const { search } = req.query;
    let query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { patientId: { $regex: search, $options: "i" } },
        ];
    }

    const patients = await Patient.find(query).limit(10);
    return sendSuccess(res, HTTP_STATUS.OK, "Patients retrieved successfully", patients);
});

/**
 * @desc    Create or Update Patient record
 * @route   POST /api/patients
 * @access  Private
 */
export const createOrUpdatePatient = asyncHandler(async (req, res) => {
    const { patientId, name, age, gender, phone, email } = req.body;

    let patient = await Patient.findOne({ patientId });

    if (patient) {
        // Update existing patient snapshots
        patient.name = name;
        patient.age = age;
        patient.gender = gender;
        patient.phone = phone;
        patient.email = email;
        await patient.save();
    } else {
        patient = await Patient.create({
            patientId,
            name,
            age,
            gender,
            phone,
            email,
            uploadedBy: req.user._id
        });
    }

    return sendSuccess(res, HTTP_STATUS.OK, "Patient record processed", patient);
});
