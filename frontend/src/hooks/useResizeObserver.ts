import { useEffect } from 'react';

export function useResizeObserver(
    elementRef: React.RefObject<Element>,
    callback: ResizeObserverCallback
) {
    useEffect(() => {
        if (!elementRef.current) return;

        const observer = new ResizeObserver(callback);
        observer.observe(elementRef.current);

        return () => observer.disconnect();
    }, [elementRef, callback]);
}
