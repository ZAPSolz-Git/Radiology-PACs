import logger from '../config/logger.js';
import { getIO } from './socketSetup.js';

// In-memory Map to track global tasks. Lost on server restart.
const activeTasks = new Map();

/**
 * Valid Task Types:
 * - PACS_EXPORT
 * - PACS_IMPORT
 * - LOCAL_UPLOAD
 */

/**
 * Unified Task Schema:
 * {
 *   taskId: String,
 *   type: String,
 *   status: 'RUNNING' | 'COMPLETED' | 'FAILED',
 *   progress: Number (transmitted/processed count),
 *   total: Number (total files/items),
 *   message: String,
 *   metadata: Object (patientName, site, etc.),
 *   userId: String (optional, if set, task events are emitted only to this user)
 * }
 */

/**
 * Register a new task and emit update
 * @param {string} taskId - Unique task identifier
 * @param {string} type - Task type (PACS_EXPORT, PACS_IMPORT, LOCAL_UPLOAD)
 * @param {number} total - Total items to process
 * @param {object} metadata - Additional metadata (patientName, site, etc.)
 * @param {string} message - Status message
 * @param {string} [userId] - Optional user ID; if set, task events are emitted only to this user
 */
export const startTask = (taskId, type, total = 1, metadata = {}, message = 'Started', userId = null) => {
    const task = {
        taskId,
        type,
        status: 'RUNNING',
        progress: 0,
        total,
        message,
        metadata,
        userId
    };
    activeTasks.set(taskId, task);
    
    // Emit to specific user if userId is set, otherwise broadcast
    try {
        const io = getIO();
        if (io) {
            if (userId) {
                io.to(userId).emit('task:update', task);
            } else {
                io.emit('task:update', task);
            }
        }
    } catch (e) {
        logger.warn(`Could not emit task:update for ${taskId}: ${e.message}`);
    }
    
    return task;
};

/**
 * Update task progress
 */
export const updateTask = (taskId, progress, total = null, message = null) => {
    const task = activeTasks.get(taskId);
    if (!task) return null;

    task.progress = progress;
    if (total !== null) task.total = total;
    if (message !== null) task.message = message;

    try {
        const io = getIO();
        if (io) {
            if (task.userId) {
                io.to(task.userId).emit('task:update', task);
            } else {
                io.emit('task:update', task);
            }
        }
    } catch (e) {
        // ignore if io not ready
    }

    return task;
};

/**
 * Mark task as complete, emit completion event, and remove from memory
 */
export const completeTask = (taskId, message = 'Completed') => {
    const task = activeTasks.get(taskId);
    if (!task) return null;

    task.status = 'COMPLETED';
    task.progress = task.total;
    task.message = message;

    try {
        const io = getIO();
        if (io) {
            if (task.userId) {
                io.to(task.userId).emit('task:complete', task);
            } else {
                io.emit('task:complete', task);
            }
        }
    } catch (e) {}

    activeTasks.delete(taskId);
    return task;
};

/**
 * Mark task as failed, emit failure event, and remove from memory
 */
export const failTask = (taskId, message = 'Failed', errorDetails = null) => {
    const task = activeTasks.get(taskId);
    if (!task) return null;

    task.status = 'FAILED';
    task.message = message;
    if (errorDetails) task.error = errorDetails;

    try {
        const io = getIO();
        if (io) {
            if (task.userId) {
                io.to(task.userId).emit('task:failed', task);
            } else {
                io.emit('task:failed', task);
            }
        }
    } catch (e) {}

    activeTasks.delete(taskId);
    return task;
};

/**
 * Get all currently running tasks, optionally filtered by userId
 * @param {string} [userId] - If provided, only return tasks for this user
 */
export const getActiveTasks = (userId = null) => {
    const tasks = Array.from(activeTasks.values());
    if (userId) {
        return tasks.filter(task => task.userId === userId);
    }
    return tasks;
};

/**
 * Update userId for an existing task (used when userId is resolved after task creation)
 */
export const setTaskUserId = (taskId, userId) => {
    const task = activeTasks.get(taskId);
    if (task) {
        task.userId = userId;
        // Re-emit update with new userId so socket room targeting works
        try {
            const io = getIO();
            if (io) {
                if (userId) {
                    io.to(userId).emit('task:update', task);
                } else {
                    io.emit('task:update', task);
                }
            }
        } catch (e) {
            logger.warn(`Could not emit task:update for ${taskId}: ${e.message}`);
        }
    }
};

export default {
    startTask,
    updateTask,
    completeTask,
    failTask,
    getActiveTasks,
    setTaskUserId
};
