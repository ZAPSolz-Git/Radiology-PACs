import { TimelineEntry as TimelineEntryType } from '@/hooks/useCaseTimeline';
import { formatDistanceToNow } from 'date-fns';
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
    Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEntryProps {
    entry: TimelineEntryType;
    isFirst: boolean;
    isLast: boolean;
}

const getIconAndColor = (action: string | undefined, role: string | undefined) => {
    if (!action) {
        return { icon: Settings, color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }

    const actionLower = action.toLowerCase();

    if (actionLower.includes('upload')) {
        return { icon: Upload, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    if (actionLower.includes('assign')) {
        return { icon: UserPlus, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    }
    if (actionLower.includes('history') || actionLower.includes('attachment')) {
        return { icon: ClipboardList, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
    }
    if (actionLower.includes('draft') || actionLower.includes('report')) {
        return { icon: FileEdit, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    }
    if (actionLower.includes('submit')) {
        return { icon: FileText, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    }
    if (actionLower.includes('approve') || actionLower.includes('finalize')) {
        return { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' };
    }
    if (actionLower.includes('reject')) {
        return { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (actionLower.includes('correction')) {
        return { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    if (actionLower.includes('qa') || actionLower.includes('audit')) {
        return { icon: ShieldCheck, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    }
    if (actionLower.includes('review')) {
        return { icon: Eye, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    if (actionLower.includes('status')) {
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
        <div className="relative pl-16 pb-6">
            {/* Icon */}
            <div className={cn(
                "absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center z-10",
                color
            )}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">{displayAction}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{entry.user?.name || entry.userName}</span>
                            {entry.role && (
                                <span className={cn(
                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                    getRoleBadgeColor(entry.role)
                                )}>
                                    {entry.role}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground" title={timestamp.toLocaleString()}>
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                            {timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {(entry.details || (entry as any).notes) && (
                    <p className="text-sm text-muted-foreground mt-2 border-t border-border pt-2">
                        {entry.details || (entry as any).notes}
                    </p>
                )}

                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(entry.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
