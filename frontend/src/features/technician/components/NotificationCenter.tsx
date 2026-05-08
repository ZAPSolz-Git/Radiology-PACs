import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, MessageSquare, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotificationStore, Notification } from "@/stores/notificationStore";
import { useSocketContext } from "@/contexts/SocketContext";
import { formatDistanceToNow } from "date-fns";

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'chat': return MessageSquare;
        case 'case': return CheckCircle2;
        default: return Info;
    }
};

const getNotificationColor = (type: string) => {
    switch (type) {
        case 'chat': return 'text-indigo-500 bg-indigo-50';
        case 'case': return 'text-emerald-500 bg-emerald-50';
        default: return 'text-slate-500 bg-slate-50';
    }
};

export function NotificationCenter() {
    const { notifications, unreadCount, markAsRead, markAllAsRead: markAllInStore } = useNotificationStore();
    const { markNotificationAsRead, markAllNotificationsAsRead } = useSocketContext();

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
        markNotificationAsRead(id);
    };

    const handleMarkAllAsRead = () => {
        markAllInStore();
        markAllNotificationsAsRead();
    };

    const NotificationItem = ({ n }: { n: Notification }) => {
        const Icon = getNotificationIcon(n.type);
        const colorClass = getNotificationColor(n.type);

        return (
            <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                className={cn(
                    "p-4 cursor-pointer hover:bg-muted/20 transition-all group relative",
                    !n.isRead && "bg-indigo-50/20 shadow-[inset_4px_0_0_0_#6366f1]"
                )}
            >
                <div className="flex gap-4">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", colorClass)}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[11px] font-black uppercase text-foreground leading-none tracking-tight truncate">{n.title}</h4>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase shrink-0">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium break-words">
                            {n.message}
                        </p>
                    </div>
                    {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-indigo-500 self-start mt-1.5 shrink-0" />
                    )}
                </div>
            </div>
        );
    };

    const NotificationList = ({ items }: { items: Notification[] }) => (
        <div className="max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar">
            {items.length > 0 ? (
                <div className="divide-y divide-border/50">
                    {items.map((n) => (
                        <NotificationItem key={n._id} n={n} />
                    ))}
                </div>
            ) : (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                        <Info className="w-6 h-6 opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-50">All caught up!</p>
                </div>
            )}
        </div>
    );

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-transparent bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border/60 relative group"
                >
                    <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 min-w-[14px] h-[14px] bg-red-500 rounded-full border-2 border-background text-[8px] font-black text-white flex items-center justify-center px-0.5 animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-full max-w-[340px] xs:max-w-[380px] sm:w-[420px] sm:max-w-none p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl mx-2 sm:mx-0"
                align="end"
                sideOffset={8}
                collisionPadding={16}
            >
                <div className="bg-card p-4 sm:p-5 flex flex-col gap-4 border-b border-border/70">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold tracking-wide text-foreground">Notifications</span>
                            <Badge variant="secondary" className="bg-muted text-foreground border-none text-[10px] font-semibold px-2 h-5">
                                {unreadCount} unread
                            </Badge>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                onClick={handleMarkAllAsRead}
                                className="text-[10px] font-semibold text-muted-foreground hover:text-foreground h-auto p-0"
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>
                <div className="px-4 pt-3 pb-2 border-b border-border/60">
                    <div className="inline-flex h-8 items-center rounded-lg bg-muted px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Chat Updates
                    </div>
                </div>
                <NotificationList items={notifications.filter((n) => n.type === "chat")} />

                <div className="bg-muted/20 p-3 border-t border-border">
                    <Button variant="ghost" className="w-full text-[10px] font-semibold uppercase tracking-[0.12em] h-10 hover:bg-card transition-all rounded-xl">
                        View Audit Log
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
