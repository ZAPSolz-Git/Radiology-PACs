import { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    PieChart,
    Calendar,
    ArrowUpRight,
    Target,
    DollarSign,
    Loader2,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PerformanceService, PerformanceStats } from '../services/PerformanceService';
import { toast } from 'sonner';

export function PerformanceAnalytics() {
    const [stats, setStats] = useState<PerformanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await PerformanceService.getStats();
                setStats(data);
            } catch (error) {
                toast.error("Failed to load performance analytics");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synthesizing Analytics Intelligence...</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-lg font-black tracking-tight text-foreground uppercase">Clinical Performance Index</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Diagnostic Volume & Efficiency Analytics</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-background border border-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 transition-all">Last 15 Days</button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">Lifetime</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Earnings Card - New */}
                <div className="bg-indigo-600 rounded-2xl p-6 shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                    <div className="flex items-center gap-2 mb-4 opacity-80">
                        <DollarSign className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Total Earnings</h3>
                    </div>
                    <div className="text-3xl font-black mb-1">₹{stats.overview.totalEarnings.toLocaleString()}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">Calculated from {stats.overview.totalCases} finalized cases</div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Quality Score</h3>
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">{stats.overview.completionRate}%</div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        On Track
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.overview.completionRate}%` }} />
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Avg Response (TAT)</h3>
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">{stats.overview.avgTAT}m</div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                        <Clock className="w-3.5 h-3.5" />
                        Mins per case
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }} />
                    </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Total Finalized</h3>
                    </div>
                    <div className="text-3xl font-black text-foreground mb-1">{stats.overview.totalCases}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Lifetime volume</div>
                    <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Volume Distribution Chart */}
                <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Performance Velocity (Last 15 Days)</h3>
                        </div>
                    </div>

                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {stats.dailyActivity.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold uppercase text-muted-foreground/30">
                                Insufficient Data Points
                            </div>
                        ) : (
                            stats.dailyActivity.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div className="w-full relative bg-slate-50 rounded-lg min-h-[4px]">
                                        <div
                                            className="relative bg-indigo-600 rounded-lg w-full transition-all duration-500 group-hover:bg-indigo-400 shadow-lg shadow-indigo-200"
                                            style={{ height: `${Math.max((day.count / Math.max(...stats.dailyActivity.map(d => d.count), 1)) * 100, 5)}%` }}
                                        />
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {day.count}
                                        </div>
                                    </div>
                                    <span className="text-[7px] font-black text-muted-foreground/40 uppercase rotate-45 origin-left whitespace-nowrap">
                                        {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Modality Breakdown List */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Modality Intensity</h3>
                    </div>

                    <div className="space-y-4">
                        {stats.modalityDistribution.length === 0 ? (
                            <div className="text-center py-12 text-xs font-bold uppercase text-muted-foreground/30">No modality data</div>
                        ) : (
                            stats.modalityDistribution.map((item, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-black uppercase tracking-wider">{item.name}</span>
                                        <span className="text-xs font-black text-indigo-600">{item.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-1000",
                                                i % 3 === 0 ? "bg-indigo-600" : i % 3 === 1 ? "bg-purple-600" : "bg-blue-600"
                                            )}
                                            style={{ width: `${(item.value / stats.overview.totalCases) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>Diagnostic Reach</span>
                            <span>{stats.modalityDistribution.length} Modalities</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
