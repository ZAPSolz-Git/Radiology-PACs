import { useState, useRef, useEffect, useMemo } from 'react';
import {
    MessageSquare,
    Send,
    User,
    Shield,
    UserPlus,
    Clock,
    CheckCheck,
    Check,
    MoreVertical,
    ArrowDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CaseChatHubProps {
    caseId: string;
    patientName: string;
    radiologistName?: string;
    technicianName?: string;
    qaName?: string;
    readonly?: boolean;
    isSidePanel?: boolean;
}

export function CaseChatHub({ caseId, patientName, radiologistName, technicianName, qaName, readonly = false, isSidePanel = false }: CaseChatHubProps) {
    const { user } = useAuthStore();
    const [inputText, setInputText] = useState('');

    // Determine initial chat type based on role
    const isQA = user?.role?.toLowerCase() === 'qa';
    const isRadiologist = user?.role?.toLowerCase() === 'radiologist';
    const isTechnician = user?.role?.toLowerCase() === 'technician';
    const isAdmin = user?.role?.toLowerCase() === 'admin';

    const [chatType, setChatType] = useState<'technician' | 'radiologist' | 'group' | 'qa'>(
        isQA || isAdmin ? 'technician' : 'qa'
    );

    const {
        isConnected,
        messages,
        typingUsers,
        onlineUsers,
        unreadCount,
        lastSeenTimestamps,
        sendMessage,
        startTyping,
        stopTyping,
        markMessagesAsRead
    } = useSocket(caseId);

    // Scroll and unread tracking
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const visibleMessagesRef = useRef<Set<string>>(new Set());
    const readBatchRef = useRef<Set<string>>(new Set());
    const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive (only if already at bottom)
    useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, typingUsers, isAtBottom]);

    // Scroll position detection
    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const atBottom = distanceFromBottom < 50;

        setIsAtBottom(atBottom);
        setShowScrollButton(!atBottom && distanceFromBottom > 200);
    };

    // Scroll to bottom function
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                let hasNewReads = false;

                entries.forEach((entry) => {
                    const messageId = entry.target.getAttribute('data-message-id');
                    if (messageId) {
                        if (entry.isIntersecting) {
                            visibleMessagesRef.current.add(messageId);
                            // Queue for read marking if not from current user
                            const msg = messages.find(m => (m._id || m.id) === messageId);
                            if (msg && msg.senderId !== user?._id) {
                                readBatchRef.current.add(messageId);
                                hasNewReads = true;
                            }
                        } else {
                            visibleMessagesRef.current.delete(messageId);
                        }
                    }
                });

                // Debounced batch read marking (1s delay)
                if (hasNewReads && readBatchRef.current.size > 0) {
                    if (readTimerRef.current) clearTimeout(readTimerRef.current);
                    readTimerRef.current = setTimeout(() => {
                        const batch = Array.from(readBatchRef.current);
                        readBatchRef.current.clear();
                        if (batch.length > 0) {
                            markMessagesAsRead(batch);
                        }
                    }, 1000);
                }
            },
            { threshold: 0.5, root: scrollRef.current }
        );

        messageRefs.current.forEach((element) => {
            observer.observe(element);
        });

        return () => {
            observer.disconnect();
            if (readTimerRef.current) clearTimeout(readTimerRef.current);
        };
    }, [messages, user, markMessagesAsRead]);

    // Desktop notifications
    useEffect(() => {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const latestMessage = messages[messages.length - 1];
        if (!latestMessage || latestMessage.senderId === user?._id) return;

        // Only notify if window is not focused OR the user is not at the bottom (scrolled up)
        const shouldNotify = !document.hasFocus() || !isAtBottom;

        if (shouldNotify && Notification.permission === 'granted') {
            // Check if this specific case is the one active in the Hub
            // Since CaseChatHub is per-case, if it's rendered, it IS that case.
            // But we only notify if the user isn't looking at the latest message.

            const notification = new Notification(
                `${latestMessage.senderName} (${latestMessage.senderRole})`,
                {
                    body: latestMessage.text.substring(0, 100),
                    icon: '/favicon.ico',
                    tag: latestMessage._id || latestMessage.id,
                    requireInteraction: false,
                    silent: false
                }
            );

            notification.onclick = () => {
                window.focus();
                scrollToBottom();
            };

            setTimeout(() => notification.close(), 5000);
        }
    }, [messages, user, isAtBottom]);

    const handleSendMessage = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText, chatType);
        setInputText('');
        stopTyping();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value);
        if (e.target.value.trim()) {
            startTyping();
        } else {
            stopTyping();
        }
    };

    const getChatTitle = () => {
        switch (chatType) {
            case 'group':
                return 'Group Discussion';
            case 'radiologist':
                return `Radiologist: ${radiologistName || 'Unassigned'}`;
            case 'technician':
                return `Technician: ${technicianName || 'Pending'}`;
            case 'qa':
                return `Quality Assurance: ${qaName || 'Department'}`;
            default:
                return 'Chat';
        }
    };

    // Memoize the heavy message filter so it only recalculates when deps change
    const filteredMessages = useMemo(() => {
        return messages.filter(msg => {
            const msgSenderRole = (msg.senderRole || msg.role || '').toLowerCase();

            // Admins see BOTH sides of the conversation in the selected channel
            if (isAdmin) {
                if (chatType === 'group') return msg.chatType === 'group' || !msg.chatType;

                if (chatType === 'technician') {
                    // QA chatting with Technician
                    return (msgSenderRole === 'qa' && msg.chatType === 'technician') ||
                        (msgSenderRole === 'technician' && msg.chatType === 'qa');
                }

                if (chatType === 'radiologist') {
                    // QA chatting with Radiologist
                    return (msgSenderRole === 'qa' && msg.chatType === 'radiologist') ||
                        (msgSenderRole === 'radiologist' && msg.chatType === 'qa');
                }

                return msg.chatType === chatType || msgSenderRole === chatType;
            }

            // Group chat sees everything with chatType: 'group'
            if (chatType === 'group') return msg.chatType === 'group' || !msg.chatType;

            const myRole = user?.role?.toLowerCase();

            // For targeted chats, we create strict two-way channels:
            // Only show messages that are part of THIS specific conversation

            // QA Chat: Only QA ↔ Current User messages
            if (chatType === 'qa') {
                if (myRole === 'qa') return false;
                return (
                    (msgSenderRole === myRole && msg.chatType === 'qa') ||
                    (msgSenderRole === 'qa' && msg.chatType === myRole)
                );
            }

            // Radiologist Chat: Only Radiologist ↔ Current User messages
            if (chatType === 'radiologist') {
                if (myRole === 'radiologist') return false;
                return (
                    (msgSenderRole === myRole && msg.chatType === 'radiologist') ||
                    (msgSenderRole === 'radiologist' && msg.chatType === myRole)
                );
            }

            // Technician Chat: Only Technician ↔ Current User messages
            if (chatType === 'technician') {
                if (myRole === 'technician') return false;
                return (
                    (msgSenderRole === myRole && msg.chatType === 'technician') ||
                    (msgSenderRole === 'technician' && msg.chatType === myRole)
                );
            }

            return false;
        });
    }, [messages, chatType, user, isAdmin]);

    return (
        <div className={cn(
            "flex flex-col bg-slate-900 overflow-hidden",
            isSidePanel
                ? "h-full w-full"
                : "h-[800px] max-h-[calc(100vh-200px)] rounded-lg border border-slate-800 shadow-lg"
        )}>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                        {unreadCount > 0 && (
                            <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5 text-xs font-semibold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs font-medium text-blue-400 mb-0.5 uppercase tracking-wide">
                            CASE CHAT
                        </div>
                        <div className="text-sm font-semibold text-white">
                            {patientName}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Online Status Indicators */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                        {onlineUsers.some(u => u.userRole === 'technician') && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-xs text-slate-300 font-medium">Technician</span>
                            </div>
                        )}
                        {onlineUsers.some(u => u.userRole === 'radiologist') && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-xs text-slate-300 font-medium">Radiologist</span>
                            </div>
                        )}
                        {onlineUsers.some(u => u.userRole === 'qa') && (
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-xs text-slate-300 font-medium">QA</span>
                            </div>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 text-sm font-medium gap-2 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                            >
                                {chatType === 'group' ? 'Group' : chatType === 'qa' ? 'QA' : chatType === 'radiologist' ? (isAdmin ? 'QA ↔ Rad' : 'Radiologist') : (isAdmin ? 'QA ↔ Tech' : 'Technician')}
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 bg-slate-800 border-slate-700">
                            {isQA || isAdmin ? (
                                <>
                                    <DropdownMenuItem onClick={() => setChatType('technician')} className="text-sm text-slate-200 hover:bg-slate-700">
                                        <User className="w-4 h-4 mr-2" />
                                        <div className="flex flex-col flex-1">
                                            <span className="font-medium">Technician</span>
                                            <span className="text-xs text-slate-400">{technicianName || 'Pending'}</span>
                                        </div>
                                        {!onlineUsers.some(u => u.userRole === 'technician') && lastSeenTimestamps[technicianName || ''] && (
                                            <span className="text-xs text-slate-500 ml-2">
                                                {formatDistanceToNow(new Date(lastSeenTimestamps[technicianName || '']), { addSuffix: true })}
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setChatType('radiologist')} className="text-sm text-slate-200 hover:bg-slate-700">
                                        <Shield className="w-4 h-4 mr-2" />
                                        <div className="flex flex-col flex-1">
                                            <span className="font-medium">Radiologist</span>
                                            <span className="text-xs text-slate-400">{radiologistName || 'Unassigned'}</span>
                                        </div>
                                        {!onlineUsers.some(u => u.userRole === 'radiologist') && lastSeenTimestamps[radiologistName || ''] && (
                                            <span className="text-xs text-slate-500 ml-2">
                                                {formatDistanceToNow(new Date(lastSeenTimestamps[radiologistName || '']), { addSuffix: true })}
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <DropdownMenuItem onClick={() => setChatType('qa')} className="text-sm text-slate-200 hover:bg-slate-700">
                                    <Shield className="w-4 h-4 mr-2" />
                                    <div className="flex flex-col flex-1">
                                        <span className="font-medium">QA Department</span>
                                        <span className="text-xs text-slate-400">{qaName || 'Central'}</span>
                                    </div>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setChatType('group')} className="text-sm text-slate-200 hover:bg-slate-700">
                                <UserPlus className="w-4 h-4 mr-2" />
                                <span className="font-medium">Group Discussion</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900 relative custom-scrollbar"
            >
                {!isConnected && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded-md text-xs font-medium text-amber-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Reconnecting...
                    </div>
                )}

                {filteredMessages.map((msg) => {
                    const myId = user?._id;
                    const isMsgFromMe = msg.senderId === myId || msg.senderId?._id === myId;

                    const role = (msg.senderRole || msg.role || '').toLowerCase();
                    const isDoctor = role === 'radiologist' || role === 'doctor';
                    const isTech = role === 'technician';
                    const isQAInMsg = role === 'qa';

                    const timestamp = msg.createdAt || msg.timestamp;

                    const deliveryStatus = msg.deliveryStatus || 'sent';
                    const readByUsers = msg.readBy || [];
                    const hasBeenRead = readByUsers.length > 0;

                    return (
                        <div
                            key={msg._id || msg.id}
                            ref={(el) => {
                                if (el && (msg._id || msg.id)) {
                                    messageRefs.current.set(msg._id || msg.id!, el);
                                }
                            }}
                            data-message-id={msg._id || msg.id}
                            className={cn(
                                "flex flex-col max-w-[75%] group/msg",
                                isMsgFromMe ? "ml-auto items-end" : "items-start"
                            )}
                        >
                            {/* Message Header */}
                            <div className="flex items-center gap-2 mb-1.5 px-1">
                                <span className={cn(
                                    "text-xs font-semibold",
                                    isDoctor ? "text-indigo-400" :
                                        isTech ? "text-amber-400" :
                                            "text-teal-400"
                                )}>
                                    {isDoctor ? 'Radiologist' : isTech ? 'Technician' : 'QA'} • {msg.senderName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {/* Message Bubble */}
                            <div className={cn(
                                "relative px-4 py-3 rounded-lg text-sm leading-relaxed",
                                isMsgFromMe
                                    ? "bg-indigo-600 text-white rounded-tr-sm"
                                    : "bg-white text-slate-900 rounded-tl-sm"
                            )}>
                                {msg.text}

                                {/* Delivery & Read Status for Sent Messages */}
                                {isMsgFromMe && (
                                    <div className="absolute -bottom-6 right-0 flex items-center gap-2">
                                        {/* Delivery Status Icons */}
                                        <div className="flex items-center gap-1">
                                            {deliveryStatus === 'sending' && (
                                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            {deliveryStatus === 'sent' && (
                                                <Check className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            {deliveryStatus === 'delivered' && (
                                                <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            {deliveryStatus === 'read' && (
                                                <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                                            )}
                                        </div>

                                        {/* Read Receipts with Avatars */}
                                        {hasBeenRead && (
                                            <div className="flex -space-x-1.5 group/receipts relative">
                                                {readByUsers.slice(0, 3).map((reader, idx) => (
                                                    <div
                                                        key={reader.userId}
                                                        className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[9px] font-semibold text-white"
                                                        style={{ zIndex: 10 - idx }}
                                                        title={reader.userName}
                                                    >
                                                        {(reader.userName || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                ))}
                                                {readByUsers.length > 3 && (
                                                    <div className="w-5 h-5 rounded-full bg-slate-600 border-2 border-slate-900 flex items-center justify-center text-[9px] font-semibold text-white">
                                                        +{readByUsers.length - 3}
                                                    </div>
                                                )}

                                                {/* Tooltip on hover */}
                                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/receipts:block bg-slate-800 text-white text-xs px-3 py-2 rounded-md shadow-lg whitespace-nowrap z-50 border border-slate-700">
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-[11px] text-slate-300 mb-1">Read by:</div>
                                                        {readByUsers.map(reader => (
                                                            <div key={reader.userId} className="text-xs">
                                                                {reader.userName} • {new Date(reader.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="absolute top-full right-4 -mt-1 w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Typing indicators */}
                {typingUsers.length > 0 && typingUsers.some(u => u.userId !== user?._id) && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-medium text-slate-400">
                            {typingUsers.filter(u => u.userId !== user?._id)[0].userName} is typing...
                        </span>
                    </div>
                )}

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 z-50 w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
                        aria-label="Scroll to bottom"
                    >
                        <ArrowDown className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5 text-xs font-semibold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </button>
                )}
            </div>

            {/* Input Area */}
            {!readonly ? (
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type your message..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 pr-12 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none h-[56px] custom-scrollbar"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Shield className="w-4 h-4 text-slate-600" />
                            </div>
                        </div>

                        <Button
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            className="h-[56px] w-[56px] rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white p-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center">
                    <p className="text-xs text-slate-500 font-medium italic">
                        Viewing as Administrator • Read Only Mode
                    </p>
                </div>
            )}
        </div>
    );
}