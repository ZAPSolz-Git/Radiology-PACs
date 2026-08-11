import { RadiologistDetails } from '../../types';
import {
    Search,
    Stethoscope,
    Clock,
    Star,
    Phone,
    Circle,
    UserCircle2,
    CheckCircle2,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface DoctorDiscoveryProps {
    doctors: RadiologistDetails[];
    isLoading: boolean;
    onAssign: (doctorId: string) => void;
    suggestedDoctorId?: string;
}

export function DoctorDiscovery({ doctors, isLoading, onAssign, suggestedDoctorId }: DoctorDiscoveryProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDoctors = doctors.filter(dr =>
        dr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dr.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-2xl border border-border" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-indigo-600 transition-colors" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or sub-specialty (e.g. Neuro)..."
                    className="w-full bg-muted/20 border border-border rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {filteredDoctors.map((dr) => (
                    <div
                        key={dr._id}
                        className={cn(
                            "group p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between",
                            suggestedDoctorId === dr._id
                                ? "bg-indigo-50/30 border-indigo-200 ring-1 ring-indigo-500/20"
                                : "bg-card border-border hover:border-indigo-200"
                        )}
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                    <UserCircle2 className="w-7 h-7" />
                                </div>
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                                    dr.online ? "bg-emerald-500" : "bg-muted text-muted-foreground/40"
                                )}>
                                    {dr.online && <Circle className="w-1.5 h-1.5 text-white fill-white" />}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{dr.name}</h4>
                                    {suggestedDoctorId === dr._id && (
                                        <Badge className="bg-indigo-600 text-[8px] font-black uppercase tracking-widest px-2 h-4">Recommended</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        {dr.specialties.join(' • ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 text-right">
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-0.5">
                                    <div className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center justify-end gap-1">
                                        <Clock className="w-3 h-3" />
                                        Avg TAT
                                    </div>
                                    <div className="text-xs font-black text-indigo-600">{dr.avgTAT}</div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center justify-end gap-1">
                                        <Filter className="w-3 h-3" />
                                        Load
                                    </div>
                                    <div className="text-xs font-black text-foreground">{dr.currentWorkload} Cases</div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest flex items-center justify-end gap-1">
                                        <Star className="w-3 h-3" />
                                        Score
                                    </div>
                                    <div className="text-xs font-black text-foreground">{dr.rating}</div>
                                </div>
                            </div>

                            <Button
                                onClick={() => onAssign(dr._id)}
                                className={cn(
                                    "h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all",
                                    suggestedDoctorId === dr._id
                                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                )}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Assign
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-muted/20 rounded-2xl flex items-center gap-3">
                <Phone className="w-4 h-4 text-indigo-600" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Note: Assignment triggers an immediate encrypted hand-off via WhatsApp and SMS node.
                </p>
            </div>
        </div>
    );
}
