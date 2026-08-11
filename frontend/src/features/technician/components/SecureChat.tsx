import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Send,
    ShieldCheck,
    User,
    Lock,
    PhoneOff,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Message {
    id: string;
    sender: 'technician' | 'doctor';
    text: string;
    timestamp: Date;
}

interface SecureChatProps {
    caseId: string;
    onClose: () => void;
}

export function SecureChat({ caseId, onClose }: SecureChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'doctor',
            text: "Hi, series 3 has some motion artifacts. Can you please re-scan the axial T2 while the patient is still there?",
            timestamp: new Date(Date.now() - 3600000)
        },
        {
            id: '2',
            sender: 'technician',
            text: "Sure Doctor, starting the re-scan now. Will upload shortly.",
            timestamp: new Date(Date.now() - 3000000)
        }
    ]);
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (!inputText.trim()) return;
        const newMsg: Message = {
            id: Date.now().toString(),
            sender: 'technician',
            text: inputText,
            timestamp: new Date()
        };
        setMessages([...messages, newMsg]);
        setInputText('');
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Chat Header */}
            <div className="bg-primary/5 p-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                                Dr. S**** K****
                                <Badge variant="secondary" className="text-[8px] h-3.5 bg-green-500/10 text-green-600 font-black border-0">ONLINE</Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                <PhoneOff className="w-2.5 h-2.5" />
                                Masking Active
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 p-1.5 rounded-lg flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-600" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-yellow-700">QA Monitored Channel</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex flex-col max-w-[85%]",
                            m.sender === 'technician' ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                    >
                        <div className={cn(
                            "p-3 rounded-2xl text-[13px] leading-relaxed font-medium shadow-sm",
                            m.sender === 'technician'
                                ? "bg-primary text-white rounded-tr-none"
                                : "bg-background border border-border text-foreground rounded-tl-none"
                        )}>
                            {m.text}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter">
                            {format(m.timestamp, 'HH:mm')} • {m.sender === 'technician' ? 'Technician' : 'Doctor'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border flex items-center gap-2">
                <div className="relative flex-1">
                    <Input
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        className="h-10 pr-10 bg-muted/20 border-border rounded-xl focus:ring-primary/20 text-sm"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Lock className="w-3 h-3 text-muted-foreground opacity-50" />
                    </div>
                </div>
                <Button
                    size="icon"
                    onClick={handleSend}
                    className="h-10 w-10 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
