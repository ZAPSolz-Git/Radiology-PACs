export type UserRole = 'user' | 'technician' | 'radiologist' | 'admin' | 'qa' | 'institution';

export interface User {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    institution?: string;
    signature?: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
}
