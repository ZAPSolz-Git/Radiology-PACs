import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocketContext } from './SocketContext';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

// Tasks that have not received any update for this many milliseconds are
// considered stuck (e.g. socket disconnected mid-operation) and auto-failed.
const STUCK_TASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export interface BackgroundTask {
    taskId: string;
    type: 'PACS_EXPORT' | 'PACS_IMPORT' | 'PACS_PUSH' | 'STUDY_PROCESS' | 'LOCAL_UPLOAD';
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    progress: number;
    total: number;
    message: string;
    metadata: any;
    userId?: string;
}

interface TaskContextType {
    activeTasks: BackgroundTask[];
    getActiveTaskByUID: (uid: string) => BackgroundTask | undefined;
    setLocalTask: (task: BackgroundTask) => void;
    removeLocalTask: (taskId: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTasks, setActiveTasks] = useState<BackgroundTask[]>([]);
    const { socket } = useSocketContext();
    const { user } = useAuthStore();
    // taskId → timeout handle. Each RUNNING task gets a watchdog timer;
    // any update (task:update, task:complete, task:failed) resets it.                                                                                                                                                                                                                                                                                                                                                                                                          
    const stuckTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Schedule (or reschedule) a watchdog for a task that is still RUNNING.
    // If the task goes 10 minutes without any update it is auto-failed and removed.
    const armStuckTimer = (taskId: string) => {
        clearStuckTimer(taskId);
        const handle = setTimeout(() => {
            stuckTimersRef.current.delete(taskId);
            setActiveTasks(prev => {
                const task = prev.find(t => t.taskId === taskId);
                if (!task || task.status !== 'RUNNING') return prev;
                toast.error('Background Task Timed Out', {
                    description: `"${task.metadata?.patientName || taskId}" did not complete in time — connection may have been lost.`,
                    duration: 8000,
                });
                // Mark as failed briefly so the user sees it, then auto-remove.
                setTimeout(() => {
                    setActiveTasks(p => p.filter(t => t.taskId !== taskId));
                }, 8000);
                return prev.map(t =>
                    t.taskId === taskId
                        ? { ...t, status: 'FAILED' as const, message: 'Timed out — no update received for 10 minutes' }
                        : t
                );
            });
        }, STUCK_TASK_TIMEOUT_MS);
        stuckTimersRef.current.set(taskId, handle);
    };




    const clearStuckTimer = (taskId: string) => {
        const handle = stuckTimersRef.current.get(taskId);
        if (handle !== undefined) {
            clearTimeout(handle);
            stuckTimersRef.current.delete(taskId);
        }
    };

    useEffect(() => {
        if (!socket) return;

        // Sync initial tasks — arm watchdogs for any already-running tasks.
        socket.emit('task:sync', {}, (response: any) => {
            if (response?.success && response.activeTasks) {
                // Filter tasks to only include this user's tasks or local tasks
                const userTasks = (response.activeTasks as BackgroundTask[]).filter(
                    t => !t.userId || t.userId === user?._id
                );
                setActiveTasks(userTasks);
                userTasks.forEach(t => {
                    if (t.status === 'RUNNING') armStuckTimer(t.taskId);
                });
            }
        });

        // Event Listeners
        const onTaskUpdate = (task: BackgroundTask) => {
            // Discard updates for other users' tasks
            if (task.userId && task.userId !== user?._id) return;

            if (task.status === 'RUNNING') {
                armStuckTimer(task.taskId);
            } else {
                clearStuckTimer(task.taskId);
            }
            setActiveTasks(prev => {
                const exists = prev.find(t => t.taskId === task.taskId);
                if (exists) {
                    return prev.map(t => t.taskId === task.taskId ? task : t);
                }
                return [...prev, task];
            });
        };

        const onTaskComplete = (task: BackgroundTask) => {
            // Discard completion for other users' tasks
            if (task.userId && task.userId !== user?._id) return;

            clearStuckTimer(task.taskId);
            setActiveTasks(prev => prev.filter(t => t.taskId !== task.taskId));
            toast.success(task.message || "Task completed successfully!");
        };

        const onTaskFailed = (task: BackgroundTask) => {
            // Discard failure for other users' tasks
            if (task.userId && task.userId !== user?._id) return;

            clearStuckTimer(task.taskId);
            setActiveTasks(prev => prev.filter(t => t.taskId !== task.taskId));
            toast.error("Background Task Failed", {
                description: task.message || "An error occurred during processing",
                duration: 8000
            });
        };

        socket.on('task:update', onTaskUpdate);
        socket.on('task:complete', onTaskComplete);
        socket.on('task:failed', onTaskFailed);

        return () => {
            socket.off('task:update', onTaskUpdate);
            socket.off('task:complete', onTaskComplete);
            socket.off('task:failed', onTaskFailed);
            // Clear all watchdog timers to prevent memory leaks / phantom failures.
            stuckTimersRef.current.forEach(handle => clearTimeout(handle));
            stuckTimersRef.current.clear();
        };
    }, [socket, user?._id]);

    const getActiveTaskByUID = (uid: string) => {
        return activeTasks.find(t => t.metadata?.studyInstanceUID === uid);
    };

    const setLocalTask = (task: BackgroundTask) => {
        // Keep the watchdog alive for locally-tracked tasks too.
        if (task.status === 'RUNNING') {
            armStuckTimer(task.taskId);
        } else {
            clearStuckTimer(task.taskId);
        }
        setActiveTasks(prev => {
            const exists = prev.find(t => t.taskId === task.taskId);
            if (exists) {
                return prev.map(t => t.taskId === task.taskId ? task : t);
            }
            return [...prev, task];
        });
    };

    const removeLocalTask = (taskId: string) => {
        clearStuckTimer(taskId);
        setActiveTasks(prev => prev.filter(t => t.taskId !== taskId));
    };

    return (
        <TaskContext.Provider value={{ activeTasks, getActiveTaskByUID, setLocalTask, removeLocalTask }}>
            {children}
        </TaskContext.Provider>
    );
};

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};
