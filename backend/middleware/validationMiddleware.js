import { z } from 'zod';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/index.js';
import logger from '../config/logger.js';

/**
 * Middleware to validate request data against a Zod schema.
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 * @param {'body' | 'query' | 'params'} source - The source of the data (body, query, or params).
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
    try {
        const data = req[source];
        const validatedData = schema.parse(data);
        req[source] = validatedData; // Replace with validated/sanitized data
        next();
    } catch (error) {
        if (error instanceof z.ZodError || error.name === 'ZodError') {
            const issues = error.errors || error.issues || [];

            if (!issues.length) {
                logger.error("ZodError caught but no issues found:", error);
                return res.status(400).json({ error: "Validation failed" });
            }

            const errorMessages = issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
                code: issue.code
            }));

            return res.status(400).json({
                error: 'Validation Error',
                details: errorMessages
            });
        } else {
            logger.error(`Validation Middleware Error: ${error.message}`, { stack: error.stack });
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                message: ERROR_MESSAGES.SERVER_ERROR,
            });
        }
    }
};
