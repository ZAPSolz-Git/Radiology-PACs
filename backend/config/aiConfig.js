export const AI_CONFIG = {
    // URL of the standalone Python microservice
    SERVICE_URL: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',

    // Endpoint for study analysis
    ANALYZE_ENDPOINT: '/analyze',

    // Callback URL that the AI service hits when done
    // Note: In production, this should be the public URL of the backend
    CALLBACK_URL: (process.env.BASE_URL || 'http://localhost:5000') + '/api/internal/integrity/results',

    // Whether to run AI validation automatically on upload
    AUTO_RUN: false
};
