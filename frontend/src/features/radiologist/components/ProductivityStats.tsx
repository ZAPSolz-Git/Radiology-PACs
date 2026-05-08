import {
    Activity,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityStatsProps {
    stats: {
        total: number;
        pending: number;
        stat: number;
        finalizedToday: number;
        avgTAT: string;
    };
}

export function ProductivityStats({ stats }: ProductivityStatsProps) {
    const statCards = [
        {
            label: 'Active Cases',
            value: stats.total,
            icon: Activity,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            accent: 'bg-indigo-500/30',
            chip: 'In Worklist'
        },
        {
            label: 'STAT Priority',
            value: stats.stat,
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            accent: 'bg-red-500/30',
            chip: 'Needs Priority'
        },
        {
            label: 'Today Finalized',
            value: stats.finalizedToday,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            accent: 'bg-emerald-500/30',
            chip: 'Completed'
        },
        {
            label: 'Avg. Turnaround',
            value: stats.avgTAT,
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            accent: 'bg-blue-500/30',
            chip: 'Performance'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            {statCards.map((card, i) => (
                <div
                    key={i}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="group relative overflow-hidden bg-card/95 rounded-2xl border border-border p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 hover:border-border/80 transition-all"
                >
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/0 via-white/0 to-foreground/[0.03]" />
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</div>
                            <div className="text-3xl leading-none font-bold text-foreground tabular-nums">{card.value}</div>
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                {card.label === 'STAT Priority' ? (
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                ) : (
                                    <Sparkles className="w-3 h-3 opacity-70" />
                                )}
                                {card.chip}
                            </div>
                        </div>
                        <div className={cn("mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110", card.bg, card.color)}>
                            <card.icon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className={cn("absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full rounded-b-2xl transition-all duration-300 ease-out", card.accent)} />
                </div>
            ))}
        </div>
    );
}
