import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCaseTimeline } from '@/hooks/useCaseTimeline';
import { TimelineEntry as TimelineEntryComponent } from '@/components/timeline/TimelineEntry';
import { Loader2, AlertCircle } from 'lucide-react';

interface TimelineModalProps {
    caseId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function TimelineModal({ caseId, isOpen, onClose }: TimelineModalProps) {
    const { timeline, loading, error } = useCaseTimeline(caseId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Case Timeline
                        {timeline && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                {timeline.patientName} (MRN: {timeline.patientId})
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="ml-3 text-muted-foreground">Loading timeline...</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-6 h-6 mr-2" />
                            <span>{error}</span>
                        </div>
                    )}

                    {timeline && timeline.timeline.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No timeline entries yet
                        </div>
                    )}

                    {timeline && timeline.timeline.length > 0 && (
                        <div className="relative">
                            {/* Vertical line */}
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                            {/* Timeline entries */}
                            <div className="space-y-6">
                                {timeline.timeline.map((entry, index) => (
                                    <TimelineEntryComponent
                                        key={entry._id}
                                        entry={entry}
                                        isFirst={index === 0}
                                        isLast={index === timeline.timeline.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
