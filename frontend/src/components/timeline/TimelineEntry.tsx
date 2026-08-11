import { TimelineEntry as TimelineEntryType } from '@/hooks/useCaseTimeline';
import { formatDistanceToNow, format } from 'date-fns';
import {
    FileText,
    UserPlus,
    ClipboardList,
    FileEdit,
    ShieldCheck,
    Activity,
    Settings,
    Upload,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Eye,
    Link,
    Link2Off,
    UserCog,
    Server,
    Layers,
    Wrench,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEntryProps {
    entry: TimelineEntryType;
    isFirst: boolean;
    isLast: boolean;
}

const getIconAndColor = (action: string | undefined, _role: string | undefined) => {
    if (!action) {
        return { icon: Settings, color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }

    const a = action.toLowerCase();

    // --- Upload / ingest ---
    if (a.includes('upload') || a.includes('ingested') || a.includes('ingest')) {
        return { icon: Upload, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    // --- PACS events ---
    if (a.includes('pacs') || a.includes('c-move') || a.includes('download complete')) {
        return { icon: Server, color: 'text-sky-600 bg-sky-50 border-sky-200' };
    }
    // --- Frame-level edits ---
    if (a.includes('frame')) {
        return { icon: Layers, color: 'text-violet-600 bg-violet-50 border-violet-200' };
    }
    // --- Share link events ---
    if (a.includes('share link') && a.includes('revoked')) {
        return { icon: Link2Off, color: 'text-red-500 bg-red-50 border-red-200' };
    }
    if (a.includes('share link')) {
        return { icon: Link, color: 'text-teal-600 bg-teal-50 border-teal-200' };
    }
    // --- Re-assignment (check before plain assign) ---
    if (a.includes('re-assign') || a.includes('reassign')) {
        return { icon: UserCog, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    }
    // --- Assignment ---
    if (a.includes('assign')) {
        return { icon: UserPlus, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    }
    // --- History / attachment ---
    if (a.includes('history') || a.includes('attachment')) {
        return { icon: ClipboardList, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
    }
    // --- Report draft / report update ---
    if (a.includes('draft') || a.includes('report')) {
        return { icon: FileEdit, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    }
    // --- Submission ---
    if (a.includes('submit')) {
        return { icon: FileText, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    }
    // --- Finalized / approved ---
    if (a.includes('finalize') || a.includes('finalized') || a.includes('approve')) {
        return { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' };
    }
    // --- Accepted ---
    if (a.includes('accepted') || a.includes('accept')) {
        return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    }
    // --- Fixed / resolved ---
    if (a.includes('fixed') || a.includes('resolved')) {
        return { icon: Wrench, color: 'text-lime-600 bg-lime-50 border-lime-200' };
    }
    // --- Rejected ---
    if (a.includes('reject')) {
        return { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' };
    }
    // --- Correction request ---
    if (a.includes('correction')) {
        return { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    // --- QA / audit ---
    if (a.includes('qa') || a.includes('audit')) {
        return { icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    }
    // --- Review ---
    if (a.includes('review')) {
        return { icon: Eye, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    // --- Urgency / priority ---
    if (a.includes('urgent') || a.includes('priority') || a.includes('stat')) {
        return { icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    }
    // --- Status change ---
    if (a.includes('status')) {
        return { icon: Activity, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    }

    return { icon: Settings, color: 'text-gray-600 bg-gray-50 border-gray-200' };
};

const getRoleBadgeColor = (role: string | undefined) => {
    if (!role) return 'bg-gray-100 text-gray-700 border-gray-200';

    switch (role.toLowerCase()) {
        case 'technician':
            return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'radiologist':
            return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'qa':
            return 'bg-green-100 text-green-700 border-green-200';
        case 'admin':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export function TimelineEntry({ entry, isFirst, isLast }: TimelineEntryProps) {
    const { icon: Icon, color } = getIconAndColor(entry.action, entry.role);
    const timestamp = new Date(entry.timestamp);

    // Fallback for legacy entries without action field
    const displayAction = entry.action || entry.status || 'Status Update';

    return (
        <div className="relative pl-12 sm:pl-16 pb-4 sm:pb-6">
            {/* Icon */}
            <div className={cn(
                "absolute left-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center z-10",
                color
            )}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            {/* Content */}
            <div className="bg-card border border-border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{displayAction}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground truncate">{entry.user?.name || entry.userName}</span>
                            {entry.role && (
                                <span className={cn(
                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
                                    getRoleBadgeColor(entry.role)
                                )}>
                                    {entry.role}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                        <div className="text-xs text-muted-foreground whitespace-nowrap" title={timestamp.toLocaleString()}>
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                            {format(timestamp, 'dd MMM yyyy')}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                            {format(timestamp, 'HH:mm:ss')}
                        </div>
                    </div>
                </div>

                {(entry.details || (entry as any).notes) && (
                    <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2 break-words">
                        {entry.details || (entry as any).notes}
                    </p>
                )}

                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(entry.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground capitalize truncate mr-2">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className="font-medium text-right truncate">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
