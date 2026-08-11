import { useEffect } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

export const useSocket = (caseId: string | null) => {
    const ctx = useSocketContext();

    useEffect(() => {
        if (caseId) {
            ctx.setCurrentCaseId(caseId);
        }
        return () => {
            if (caseId) {
                ctx.setCurrentCaseId(null);
            }
        };
    }, [caseId, ctx.setCurrentCaseId]);

    // Return the merged context value to maintain the identical original shape.
    // useSocketContext already merges SocketContext (stable) and ChatContext
    // (messages/typing/presence) into a single flat object, so CaseChatHub
    // continues to destructure exactly as before.
    return ctx;
};
