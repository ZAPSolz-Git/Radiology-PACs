import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocketContext } from './SocketContext';
import { toast } from 'sonner';

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

    useEffect(() => {
        if (!socket) return;

        // Sync initial tasks
        socket.emit('task:sync', {}, (response: any) => {
            if (response?.success && response.activeTasks) {
                setActiveTasks(response.activeTasks);
            }
        });

        // Event Listeners
        const onTaskUpdate = (task: BackgroundTask) => {
            setActiveTasks(prev => {
                const exists = prev.find(t => t.taskId === task.taskId);
                if (exists) {
                    return prev.map(t => t.taskId === task.taskId ? task : t);
                }
                return [...prev, task];
            });
        };

        const onTaskComplete = (task: BackgroundTask) => {
            setActiveTasks(prev => prev.filter(t => t.taskId !== task.taskId));
            toast.success(task.message || "Task completed successfully!");
        };

        const onTaskFailed = (task: BackgroundTask) => {
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
        };
    }, [socket]);

    const getActiveTaskByUID = (uid: string) => {
        return activeTasks.find(t => t.metadata?.studyInstanceUID === uid);
    };

    const setLocalTask = (task: BackgroundTask) => {
        setActiveTasks(prev => {
            const exists = prev.find(t => t.taskId === task.taskId);
            if (exists) {
                return prev.map(t => t.taskId === task.taskId ? task : t);
            }
            return [...prev, task];
        });
    };

    const removeLocalTask = (taskId: string) => {
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
