import { User, UserRole } from '../../../types/auth';

export type AdminUserRole = UserRole | 'sub_admin';

export interface AdminUser extends Omit<User, 'role'> {
    role: AdminUserRole;
    status: 'active' | 'deactivated' | 'locked';
    phoneNumber?: string;
    hospitalId?: string;
    lastLogin?: string;
    failedLoginAttempts: number;
    twoFactorEnabled: boolean;
}

export interface Permission {
    id: string;
    name: string;
    description: string;
    category: 'case' | 'user' | 'billing' | 'system' | 'report';
}

export interface Role {
    id: string;
    name: string;
    permissions: string[]; // Array of Permission IDs
}

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
    timestamp: string;
    ipAddress?: string;
    device?: string;
    category: 'case' | 'report' | 'billing' | 'security' | 'user';
}

export interface LoginActivity {
    id: string;
    userId: string;
    userName: string;
    loginTime: string;
    logoutTime?: string;
    ipAddress: string;
    device: string;
    status: 'success' | 'failed';
}
