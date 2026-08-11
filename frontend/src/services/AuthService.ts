import api from '@/lib/axios';
import { User, LoginCredentials, RegisterData } from '@/types/auth';

export const AuthService = {
    // async register(data: RegisterData): Promise<{ user: User }> {
    //     const response = await api.post('/auth/register', data);
    //     return {
    //         user: response.data.data.user
    //     };
    // },

    async login(data: LoginCredentials): Promise<{ user: User }> {
        const response = await api.post('/auth/login', data);
        return {
            user: response.data.data.user
        };
    },

    async logout() {
        await api.post('/auth/logout');
    },

    async logoutAll() {
        await api.post('/auth/logout-all');
    },

    async getMe(): Promise<User> {
        const response = await api.get('/auth/me');
        return response.data.data.user;
    },

    async getRadiologists(): Promise<User[]> {
        const response = await api.get('/auth/radiologists');
        return response.data.data;
    }
};
