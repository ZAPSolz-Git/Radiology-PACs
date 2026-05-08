import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CaseService } from '@/features/technician/services/CaseService';
import { Case } from '@/features/technician/types/technician';

export const useCases = (filters?: any) => {
    return useQuery({
        queryKey: ['cases', filters],
        queryFn: () => CaseService.getCases(filters),
    });
};

export const useCase = (id: string) => {
    return useQuery({
        queryKey: ['case', id],
        queryFn: () => CaseService.getCaseById(id),
        enabled: !!id,
    });
};

export const useCaseMetadata = (id: string) => {
    return useQuery({
        queryKey: ['case-metadata', id],
        queryFn: () => CaseService.getCaseMetadata(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour (metadata rarely changes)
    });
};

export const useUpdateCase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data, attachments }: { id: string, data: any, attachments?: File[] }) =>
            CaseService.updateCase(id, data, attachments),
        onSuccess: (updatedCase) => {
            queryClient.invalidateQueries({ queryKey: ['cases'] });
            queryClient.invalidateQueries({ queryKey: ['case', updatedCase._id] });
            queryClient.invalidateQueries({ queryKey: ['case-metadata', updatedCase._id] });
        },
    });
};
