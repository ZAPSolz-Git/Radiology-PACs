import {
    BarChart3,
    PieChart,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    Briefcase,
    Activity,
    Loader2,
    CalendarDays,
    Building2,
    WalletCards,
    Banknote
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { AnalyticsService, RevenueAnalytics } from '../../services/AnalyticsService';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfMonth, startOfYear, subMonths } from 'date-fns';

export function FinancialAnalytics() {
    const { toast } = useToast();
    const [data, setData] = useState<RevenueAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<string>('all-time');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                let startDate, endDate;
                const now = new Date();

                if (dateFilter === 'this-month') {
                    startDate = startOfMonth(now).toISOString();
                    endDate = now.toISOString();
                } else if (dateFilter === 'last-month') {
                    const startOfLast = startOfMonth(subMonths(now, 1));
                    const endOfLast = new Date(startOfMonth(now).getTime() - 1);
                    startDate = startOfLast.toISOString();
                    endDate = endOfLast.toISOString();
                } else if (dateFilter === 'this-year') {
                    startDate = startOfYear(now).toISOString();
                    endDate = now.toISOString();
                }

                const result = await AnalyticsService.getRevenueAnalytics(startDate, endDate);
                setData(result);
            } catch (error: any) {
                toast({
                    title: 'Error Analytics',
                    description: error.response?.data?.message || 'Failed to load revenue data',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [dateFilter, toast]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aggregating Financial Metrics...</p>
            </div>
        );
    }

    const { overallStats, trajectory, modalityMix, topInstitutions, cashFlow } = data;

    // We calculate formatting thresholds for the UI cards
    const stats = [
        { label: 'Net Revenue', value: `₹${overallStats.netRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, trend: '-', up: true, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Doctor Cost', value: `₹${overallStats.doctorCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, trend: '-', up: false, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Profit Margin', value: `${overallStats.profitMargin.toFixed(1)}%`, trend: '-', up: true, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Avg Study Value', value: `₹${overallStats.avgStudyValue.toFixed(0)}`, trend: '-', up: true, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    // Find max trajectory value to size the CSS bars correctly
    const maxTrajectoryValue = Math.max(...trajectory.map(t => Math.max(t.income, t.cost)), 1);
    
    // Find max institution revenue to size bars
    const maxInstitutionRevenue = Math.max(...(topInstitutions?.map(i => i.revenue) || [0]), 1);

    // Modality colors map
    const modalityColors: Record<string, string> = {
        'CT': 'bg-indigo-600',
        'MRI': 'bg-purple-600',
        'XRay': 'bg-emerald-600',
        'US': 'bg-amber-600',
        'XRAY': 'bg-emerald-600',
        'USG': 'bg-amber-600',
    };
    const defaultColor = 'bg-slate-500';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <WalletCards className="w-8 h-8 text-indigo-600" />
                        Revenue Hub
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Real-time financial pulse of the organization</p>
                </div>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[200px] h-11 border-2 border-border/50 rounded-xl font-bold bg-background text-sm shadow-sm">
                        <CalendarDays className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Select Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-time" className="font-bold">All Time</SelectItem>
                        <SelectItem value="this-month" className="font-bold">This Month</SelectItem>
                        <SelectItem value="last-month" className="font-bold">Last Month</SelectItem>
                        <SelectItem value="this-year" className="font-bold">This Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-border/50 shadow-sm group hover:border-indigo-200 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest",
                                    stat.up ? 'text-emerald-500' : 'text-red-500'
                                )}>
                                    {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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
                {/* Revenue Breakdown */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-border/50">
                        <div>
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Revenue Trajectory</CardTitle>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Monthly income vs payout projections</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Income</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-200" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cost</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 h-[350px] flex items-end justify-between gap-4">
                        {trajectory.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest font-bold">Not Enough Data</div>
                        ) : trajectory.map((t, i) => {
                            // Calculate CSS height percentages based on the max value found
                            const incomeHeight = (t.income / maxTrajectoryValue) * 100;
                            const costHeight = (t.cost / maxTrajectoryValue) * 100;

                            return (
                                <div key={i} className="flex-1 space-y-3 group cursor-pointer h-full flex flex-col justify-end">
                                    <div className="relative h-full w-full flex flex-col justify-end">
                                        <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 px-1">
                                            {/* We use bottom-0 instead of inset-0 to prevent bars from rendering out of bounds if they are short */}
                                            <div className="flex-1 bg-indigo-600 rounded-t-md transition-all group-hover:bg-indigo-500 relative min-h-[4px]" style={{ height: `${Math.max(incomeHeight, 2)}%` }}>
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">₹{t.income.toLocaleString()}</div>
                                            </div>
                                            <div className="flex-1 bg-indigo-200 rounded-t-md transition-all group-hover:bg-indigo-300 relative min-h-[4px]" style={{ height: `${Math.max(costHeight, 2)}%` }}>
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">₹{t.cost.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black text-muted-foreground text-center uppercase tracking-widest">{t.label} {t.year.toString().slice(-2)}</div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    {/* Modality Mix */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="px-8 py-6 border-b border-border/50">
                            <CardTitle className="text-sm font-black uppercase tracking-widest">Modality Contribution</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                        {modalityMix.length === 0 ? (
                            <div className="text-center text-muted-foreground text-xs uppercase tracking-widest font-bold py-8">No Modality Data Yet</div>
                        ) : modalityMix.map((m, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">{m.label} <span className="text-[8px] opacity-50 ml-1">({m.absoluteCount} cases)</span></span>
                                    <span className="text-foreground">{m.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-1000", modalityColors[m.label] || defaultColor)} style={{ width: `${m.value}%` }} />
                                </div>
                            </div>
                        ))}

                        <div className="pt-6 mt-6 border-t border-border/50 space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Total Case Volume</span>
                                </div>
                                <span className="text-xs font-black">{overallStats.totalCases} Studies</span>
                            </div>
                            <p className="text-[9px] text-center text-muted-foreground font-medium uppercase tracking-[0.15em]">Analytics computed over finalized cases only</p>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cash Flow Statement */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm bg-gradient-to-br from-indigo-900 via-indigo-900 to-indigo-950 text-white">
                    <CardHeader className="px-8 py-6 border-b border-indigo-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-emerald-400" />
                            Cash Flow Statement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
                        {/* Receivables */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Accounts Receivable</h4>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-black text-emerald-400">₹{cashFlow?.receivables.collected.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-md">Collected</span>
                                </div>
                                <div className="h-3 bg-indigo-950 rounded-full overflow-hidden border border-indigo-800">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: cashFlow?.receivables.collected > 0 ? '100%' : '0%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xl font-bold text-amber-400">₹{cashFlow?.receivables.pending.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-md">Pending</span>
                                </div>
                                <div className="h-2 bg-indigo-950 rounded-full overflow-hidden border border-indigo-800 opacity-80">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: cashFlow?.receivables.pending > 0 ? '60%' : '0%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Payables */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Accounts Payable</h4>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-2xl font-black text-red-400">₹{cashFlow?.payables.paid.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-md">Paid Out</span>
                                </div>
                                <div className="h-3 bg-indigo-950 rounded-full overflow-hidden border border-indigo-800">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: cashFlow?.payables.paid > 0 ? '100%' : '0%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xl font-bold text-amber-400">₹{cashFlow?.payables.pending.toLocaleString()}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-md">Owed</span>
                                </div>
                                <div className="h-2 bg-indigo-950 rounded-full overflow-hidden border border-indigo-800 opacity-80">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: cashFlow?.payables.pending > 0 ? '60%' : '0%' }}></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Institutions Leaderboard */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="px-8 py-6 border-b border-border/50">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            Top Performers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {topInstitutions?.length === 0 ? (
                                <div className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No Performance Data</div>
                            ) : topInstitutions?.map((inst, idx) => (
                                <div key={idx} className="p-4 px-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-black text-indigo-600">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{inst.name}</p>
                                            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">{inst.caseCount} Studies</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black">₹{inst.revenue.toLocaleString()}</div>
                                        <div className="w-16 h-1 bg-muted mt-1.5 rounded-full overflow-hidden ml-auto">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(inst.revenue / maxInstitutionRevenue) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
