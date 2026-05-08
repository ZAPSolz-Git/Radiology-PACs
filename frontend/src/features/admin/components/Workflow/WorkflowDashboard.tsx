import { useMemo, useState, useEffect } from 'react';
import {
    Activity,
    Clock,
    AlertCircle,
    Circle,
    ArrowUpRight,
    ArrowDownRight,
    ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LiveUser } from '../../types/workflow';
import { AdminService } from '../../services/AdminService';

export function WorkflowDashboard() {
    const [analytics, setAnalytics] = useState<{ stats: any; liveStaff: LiveUser[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const data = await AdminService.getWorkflowAnalytics();
            setAnalytics(data);
        } catch (err) {
            console.error("Failed to fetch workflow analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    const statsOverview = useMemo(() => {
        if (!analytics) return [];
        return [
            { label: 'Pending Cases', value: analytics.stats.pending.toString(), trend: '+12%', trendDir: 'up', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Reported Today', value: analytics.stats.reportedToday.toString(), trend: '+5%', trendDir: 'up', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Emergency Studies', value: analytics.stats.emergency.toString(), trend: 'STAT', trendDir: 'neutral', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Integrity Alerts', value: analytics.stats.integrityWarnings.toString(), trend: 'Critical', trendDir: 'down', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50' },
        ];
    }, [analytics]);

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-2xl border border-border/50"></div>
                    ))
                ) : statsOverview.map((stat, i) => (
                    <Card key={i} className="border-border/50 shadow-sm overflow-hidden group hover:border-indigo-200 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                                    stat.trendDir === 'up' ? 'text-emerald-500' : stat.trendDir === 'down' ? 'text-red-500' : 'text-muted-foreground'
                                )}>
                                    {stat.trendDir === 'up' && <ArrowUpRight className="w-3 h-3" />}
                                    {stat.trendDir === 'down' && <ArrowDownRight className="w-3 h-3" />}
                                    {stat.trend}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
                                <h3 className="text-3xl font-black tracking-tight">{stat.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Throughput Chart Skeleton */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-border/50">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Case Velocity (Hourly)</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Real-time study ingestion vs reporting rate</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-black tracking-widest uppercase">Last 24h</Button>
                    </CardHeader>
                    <CardContent className="p-8 h-[300px] flex items-end justify-between gap-2">
                        {[40, 65, 45, 90, 75, 55, 85, 40, 60, 95, 80, 70].map((h, i) => (
                            <div key={i} className="flex-1 space-y-2 group cursor-pointer">
                                <div className="relative h-full w-full flex flex-col justify-end gap-1">
                                    <div
                                        className="w-full bg-indigo-500/20 group-hover:bg-indigo-500/30 rounded-t-sm transition-all"
                                        style={{ height: `${h}%` }}
                                    ></div>
                                    <div
                                        className="w-full bg-indigo-600 rounded-t-sm transition-all"
                                        style={{ height: `${h * 0.7}%` }}
                                    ></div>
                                </div>
                                <div className="text-[8px] font-bold text-muted-foreground text-center uppercase">{i + 1}h</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Live Active Staff */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="px-8 py-6 border-b border-border/50">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">Global Operators</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50 min-h-[400px]">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-6 animate-pulse bg-muted/5"></div>
                                ))
                            ) : analytics?.liveStaff.length === 0 ? (
                                <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    No live operators detected
                                </div>
                            ) : analytics?.liveStaff.map((user) => (
                                <div key={user.id} className="p-4 px-8 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                                {user.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <Circle className={cn(
                                                "w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 fill-current border-2 border-background rounded-full",
                                                user.status === 'online' ? 'text-emerald-500' : user.status === 'busy' ? 'text-amber-500' : 'text-slate-300'
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold leading-tight">{user.name}</h4>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{user.role}</p>
                                        </div>
                                    </div>
                                    {user.workload !== undefined && (
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-indigo-600 mb-0.5">{user.workload} Active</div>
                                            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full", user.workload > 3 ? "bg-amber-500" : "bg-indigo-500")}
                                                    style={{ width: `${(user.workload / 5) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
