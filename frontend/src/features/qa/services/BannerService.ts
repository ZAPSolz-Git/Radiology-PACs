import api from '@/lib/axios';
import { Banner } from '../types';

export const BannerService = {
    /**
     * Get all active banners for selection
     */
    getBanners: async (): Promise<Banner[]> => {
        const response = await api.get('/banners');
        return response.data.data;
    },

    /**
     * Get all banners including inactive ones (for management)
     */
    getAllBanners: async (): Promise<Banner[]> => {
        const response = await api.get('/banners/all');
        return response.data.data;
    },

    /**
     * Create a new banner
     */
    createBanner: async (formData: FormData): Promise<Banner> => {
        const response = await api.post('/banners', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    /**
     * Update an existing banner
     */
    updateBanner: async (id: string, formData: FormData): Promise<Banner> => {
        const response = await api.patch(`/banners/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data.data;
    },

    /**
     * Delete a banner
     */
    deleteBanner: async (id: string): Promise<void> => {
        await api.delete(`/banners/${id}`);
    },
};
