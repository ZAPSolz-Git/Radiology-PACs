import axios from 'axios';
import Case from '../models/Case.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { sendSuccess } from '../utils/response.js';
import logger from '../config/logger.js';

const getOrthancClient = () => {
    return axios.create({
        baseURL: process.env.ORTHANC_URL || 'http://localhost:8042',
        auth: {
            username: process.env.ORTHANC_USER || 'orthanc',
            password: process.env.ORTHANC_PASSWORD || 'orthanc'
        }
    });
};

/**
 * Get all studies from Orthanc, enriched with Case linkage status
 */
export const getOrthancStudies = async (req, res, next) => {
    try {
        const client = getOrthancClient();

        // 1. Get all studies from Orthanc (expanding metadata)
        const response = await client.get('/studies?expand');
        const orthancStudies = response.data || [];

        // 2. Format Orthanc data
        const formattedStudies = orthancStudies.map(study => ({
            id: study.ID,
            patientId: study.PatientMainDicomTags?.PatientID || 'Unknown',
            patientName: study.PatientMainDicomTags?.PatientName || 'Unknown',
            studyDate: study.MainDicomTags?.StudyDate || '',
            studyTime: study.MainDicomTags?.StudyTime || '',
            studyInstanceUID: study.MainDicomTags?.StudyInstanceUID,
            accessionNumber: study.MainDicomTags?.AccessionNumber || '',
            studyDescription: study.MainDicomTags?.StudyDescription || '',
            seriesCount: study.Series?.length || 0,
            isLinked: false, // Default to orphaned
            dbCaseId: null
        }));

        // 3. Cross-reference with our MongoDB Cases to find orphans
        const allCases = await Case.find({}, 'studyInstanceUID status patient').lean();
        const caseMap = new Map();
        allCases.forEach(c => {
            if (c.studyInstanceUID) {
                caseMap.set(c.studyInstanceUID, c._id.toString());
            }
        });

        // 4. Mark linked studies
        formattedStudies.forEach(study => {
            if (study.studyInstanceUID && caseMap.has(study.studyInstanceUID)) {
                study.isLinked = true;
                study.dbCaseId = caseMap.get(study.studyInstanceUID);
            }
        });

        // Sort by Date descending (newest first)
        formattedStudies.sort((a, b) => {
            const dateA = a.studyDate + a.studyTime;
            const dateB = b.studyDate + b.studyTime;
            return dateB.localeCompare(dateA);
        });

        sendSuccess(res, HTTP_STATUS.OK, "Orthanc studies retrieved successfully", formattedStudies);

    } catch (error) {
        logger.error(`[Orthanc Admin] Failed to fetch studies: ${error.message}`);
        next(new AppError("Failed to communicate with Orthanc PACS server", HTTP_STATUS.SERVICE_UNAVAILABLE));
    }
};

/**
 * Get specific study details from Orthanc
 */
export const getStudyDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const client = getOrthancClient();

        // Get generic study + expanded series info
        const [studyRes, seriesRes] = await Promise.all([
            client.get(`/studies/${id}`),
            client.get(`/studies/${id}/series?expand`)
        ]);

        const studyData = studyRes.data;
        const seriesData = seriesRes.data;

        const formattedSeries = seriesData.map(series => ({
            id: series.ID,
            modality: series.MainDicomTags?.Modality || 'UN',
            seriesNumber: series.MainDicomTags?.SeriesNumber || '',
            seriesDescription: series.MainDicomTags?.SeriesDescription || '',
            instanceCount: series.Instances?.length || 0,
        }));

        const result = {
            id: studyData.ID,
            patientName: studyData.PatientMainDicomTags?.PatientName || 'Unknown',
            patientId: studyData.PatientMainDicomTags?.PatientID || 'Unknown',
            studyInstanceUID: studyData.MainDicomTags?.StudyInstanceUID,
            studyDescription: studyData.MainDicomTags?.StudyDescription || '',
            series: formattedSeries
        };

        sendSuccess(res, HTTP_STATUS.OK, "Study details retrieved", result);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return next(new AppError("Study not found in Orthanc", HTTP_STATUS.NOT_FOUND));
        }
        next(new AppError("Failed to fetch study details from Orthanc", HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
};

/**
 * Delete a study from Orthanc (and optionally MongoDB)
 */
export const deleteOrthancStudy = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { cascade } = req.query; // If '?cascade=true', also delete MongoDB record

        const client = getOrthancClient();

        // 1. Get study info to access StudyInstanceUID before deleting
        let studyInstanceUID = null;
        try {
            const studyRes = await client.get(`/studies/${id}`);
            studyInstanceUID = studyRes.data?.MainDicomTags?.StudyInstanceUID;
        } catch (err) {
            logger.warn(`[Orthanc Admin] Could not fetch study info before delete for ID ${id}. It may already be gone.`);
        }

        // 2. Delete from Orthanc
        try {
            await client.delete(`/studies/${id}`);
            logger.info(`[Orthanc Admin] Deleted study ${id} from Orthanc hardware.`);
        } catch (err) {
            if (err.response && err.response.status !== 404) {
                throw err;
            }
        }

        // 3. Optional cascade delete from MongoDB
        let dbCascadeResult = "Skipped";
        if (cascade === 'true' && studyInstanceUID) {
            const dbCase = await Case.findOne({ studyInstanceUID });
            if (dbCase) {
                // We use Case static method or standard findByIdAndDelete
                await Case.findByIdAndDelete(dbCase._id);
                dbCascadeResult = `Deleted Case ${dbCase._id}`;
                logger.info(`[Orthanc Admin] Cascade deleted MongoDB Case ${dbCase._id} linked to Orthanc Study ${id}`);
            } else {
                dbCascadeResult = "No DB record found to cascade";
            }
        }

        sendSuccess(res, HTTP_STATUS.OK, "Study deleted from PACS", {
            orthancId: id,
            cascaded: dbCascadeResult
        });

    } catch (error) {
        logger.error(`[Orthanc Admin] Failed to delete study ${req.params.id}: ${error.message}`);
        next(new AppError("Failed to delete study from Orthanc", HTTP_STATUS.INTERNAL_SERVER_ERROR));
    }
};

/**
 * Get Orthanc storage statistics
 */
export const getOrthancStats = async (req, res, next) => {
    try {
        const client = getOrthancClient();
        const response = await client.get('/statistics');

        const stats = {
            totalDiskSizeMB: parseFloat(response.data.TotalDiskSizeMB || 0).toFixed(2),
            totalUncompressedSizeMB: parseFloat(response.data.TotalUncompressedSizeMB || 0).toFixed(2),
            countPatients: response.data.CountPatients || 0,
            countStudies: response.data.CountStudies || 0,
            countSeries: response.data.CountSeries || 0,
            countInstances: response.data.CountInstances || 0,
        };

        sendSuccess(res, HTTP_STATUS.OK, "Orthanc statistics retrieved", stats);

    } catch (error) {
        logger.error(`[Orthanc Admin] Failed to fetch stats: ${error.message}`);
        next(new AppError("Failed to fetch Orthanc statistics", HTTP_STATUS.SERVICE_UNAVAILABLE));
    }
};
