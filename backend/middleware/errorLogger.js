import fs from 'fs';
import path from 'path';

export const logErrorToFile = (err, req, res, next) => {
    const logPath = path.join(process.cwd(), 'error.log');
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${req.method} ${req.url} - ${err.message}\nStack: ${err.stack}\n\n`;

    // Append to file
    fs.appendFile(logPath, logMessage, (fsErr) => {
        if (fsErr) console.error("Failed to write to error log", fsErr);
    });

    next(err); // Pass to default error handler
};
