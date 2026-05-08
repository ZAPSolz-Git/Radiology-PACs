import api from '@/lib/axios';
import { AdminUser, AuditLog, LoginActivity } from '../types';
import { LiveUser, SLAMetrics, SystemAlert } from '../types/workflow';

export interface SecuritySettings {
    enforce2FA: boolean;
    passwordRotationDays: number;
    sessionTimeoutMinutes: number;
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    allowBiometricOverride: boolean;
}

export interface AuditLogItem {
    _id: string;
    category: 'AUTH' | 'USER_MGMT' | 'CASE_WORKFLOW' | 'SECURITY_CONFIG' | 'DATA_ACCESS' | 'FINANCIAL' | 'SYSTEM' | 'EXTERNAL_API';
    action: string;
    resourceType?: string;
    resourceId?: string;
    user?: {
        name: string;
        email: string;
        role: string;
    };
    userName?: string;
    role?: string;
    targetUser?: {
        name: string;
        email: string;
    };
    status: 'Success' | 'Failure' | 'Warning' | 'Info' | 'Critical';
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    ipAddress?: string;
    userAgent?: string;
    details: string;
    diff?: {
        before: any;
        after: any;
    };
    metadata?: any;
    timestamp: string;
}

export interface PaginatedResponse<T> {
    logs: T[];
    pagination: {
        totalLogs: number;
        totalPages: number;
        currentPage: number;
        limit: number;
    };
}

export class AdminService {
    static async getOverviewStats(): Promise<any> {
        const response = await api.get('/admin/overview');
        return response.data.data;
    }

    static async getUsers(params?: { search?: string; role?: string; status?: string; sort?: string }): Promise<AdminUser[]> {
        const response = await api.get('/admin/users', { params });
        return response.data.data;
    }

    static async createUser(userData: Partial<AdminUser>): Promise<AdminUser> {
        const response = await api.post('/admin/users', userData);
        return response.data.data;
    }

    static async updateUser(id: string, userData: Partial<AdminUser>): Promise<AdminUser> {
        const response = await api.patch(`/admin/users/${id}`, userData);
        return response.data.data;
    }

    static async deleteUser(id: string): Promise<void> {
        await api.delete(`/admin/users/${id}`);
    }

    static async getSecuritySettings(): Promise<SecuritySettings> {
        const response = await api.get('/admin/security/settings');
        return response.data.data;
    }

    static async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
        const response = await api.patch('/admin/security/settings', settings);
        return response.data.data;
    }

    static async getSecurityLogs(params?: {
        category?: string;
        action?: string;
        status?: string;
        resourceType?: string;
        resourceId?: string;
        search?: string;
        limit?: number;
        page?: number;
    }): Promise<PaginatedResponse<AuditLogItem>> {
        const response = await api.get('/admin/security/logs', { params });
        return response.data.data;
    }

    static async getWorkflowAnalytics(): Promise<{ stats: any; liveStaff: LiveUser[] }> {
        const response = await api.get('/admin/workflow/analytics');
        return response.data.data;
    }

    static async getSLAMetrics(): Promise<SLAMetrics[]> {
        const response = await api.get('/admin/workflow/sla');
        return response.data.data;
    }

    static async getSystemAlerts(): Promise<SystemAlert[]> {
        const response = await api.get('/admin/workflow/alerts');
        const alerts = response.data.data;
        // Ensure timestamp is a string if needed by component
        return alerts;
    }

    static async resetPassword(id: string, newPassword: string): Promise<void> {
        await api.post(`/admin/users/${id}/reset-password`, { newPassword });
    }

    static async getAuditLogs(): Promise<AuditLog[]> {
        const response = await api.get('/admin/audit-logs');
        return response.data.data;
    }

    static async getLoginActivity(params?: {
        search?: string;
        limit?: number;
        page?: number;
    }): Promise<PaginatedResponse<AuditLogItem>> {
        const response = await api.get('/admin/login-activity', { params });
        return response.data.data;
    }

    // Storage Management
    static async getStorageStats(): Promise<any> {
        const response = await api.get('/admin/storage-stats');
        return response.data.data;
    }

    static async getStorageCases(params?: {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: string;
    }): Promise<any> {
        const response = await api.get('/admin/storage-cases', { params });
        return response.data.data;
    }

    // Viewer Tool Restrictions
    static async getViewerRestrictions(): Promise<Record<string, string[]>> {
        const response = await api.get('/admin/viewer/restrictions');
        return response.data.data;
    }

    static async updateViewerRestrictions(role: string, allowedTools: string[]): Promise<any> {
        const response = await api.post('/admin/viewer/restrictions', { role, allowedTools });
        return response.data.data;
    }
}

