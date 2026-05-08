import {
    ShieldAlert,
    Lock,
    Key,
    Smartphone,
    History,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { AdminService, SecuritySettings, AuditLogItem } from '../../services/AdminService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export function SecurityDashboard() {
    const [settings, setSettings] = useState<SecuritySettings | null>(null);
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchData();
    }, [page]);

    const fetchData = async () => {
        try {
            const [s, logResponse] = await Promise.all([
                AdminService.getSecuritySettings(),
                AdminService.getSecurityLogs({ limit: 10, page })
            ]);
            setSettings(s);
            setLogs(logResponse.logs);
            setTotalPages(logResponse.pagination.totalPages);
        } catch (err) {
            toast.error("Failed to fetch security data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSetting = async (key: keyof SecuritySettings, value: boolean | number) => {
        try {
            const updated = await AdminService.updateSecuritySettings({ [key]: value });
            setSettings(updated);
            toast.success("Security policy updated");
            // Refresh logs
            const logResponse = await AdminService.getSecurityLogs({ limit: 10, page: 1 });
            setLogs(logResponse.logs);
            setTotalPages(logResponse.pagination.totalPages);
            setPage(1);
        } catch (err) {
            toast.error("Update failed");
        }
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className=" gap-8">
                {/* Global Security Policies */}
                {/* <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-border bg-muted/30">
                            <div className="flex items-center gap-3 mb-1">
                                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold uppercase tracking-tight">Access Control Engine</h3>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Global Authentication Protocols</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between p-6 rounded-2xl border border-indigo-100 bg-indigo-50/50">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="font-bold text-sm block mb-1">Enforce 2-Factor Authentication (2FA)</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Requires OTP verification for all clinical staff logins.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.enforce2FA}
                                    onCheckedChange={(val) => handleUpdateSetting('enforce2FA', val)}
                                    className="data-[state=checked]:bg-indigo-600"
                                />
                            </div>

                            <div className="flex items-center justify-between p-6 rounded-2xl border border-border bg-background">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="font-bold text-sm block mb-1">Passkey Flow / Biometrics</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Allow WebAuthn based biometric overrides for trusted devices.</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings.allowBiometricOverride}
                                    onCheckedChange={(val) => handleUpdateSetting('allowBiometricOverride', val)}
                                    className="data-[state=checked]:bg-indigo-600"
                                />
                            </div>

                            <div className="flex items-center justify-between p-6 rounded-2xl border border-border bg-background">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="font-bold text-sm block mb-1">Strict Lockout Enforcement</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Auto-lock account after {settings.maxFailedAttempts} failed attempts for {settings.lockoutDurationMinutes}m.</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[9px] font-black uppercase tracking-widest px-3 py-1">
                                    Enforced
                                </Badge>
                            </div>
                        </div>
                    </div> */}


                {/* Account Lock Settings */}
                <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-3 mb-1">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-lg font-bold uppercase tracking-tight">Intrusion Prevention</h3>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Failed Attempt Thresholds</p>
                    </div>

                    <div className="p-8 space-y-8 flex-1">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Login Failure Limit</Label>
                                <Badge variant="outline" className="text-amber-600 bg-amber-50">{settings.maxFailedAttempts} Attempts</Badge>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${(settings.maxFailedAttempts / 10) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium italic">Threshold before account is automatically flagged as "Locked".</p>
                        </div>

                        <div className="pt-6 border-t border-border mt-auto">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Quick Adjustments</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleUpdateSetting('maxFailedAttempts', settings.maxFailedAttempts + 1)}
                                    className="h-16 rounded-2xl flex flex-col gap-1 border-indigo-100 hover:bg-indigo-50/30 text-indigo-700"
                                >
                                    <ShieldAlert className="w-5 h-5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Relax Limit</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleUpdateSetting('maxFailedAttempts', Math.max(1, settings.maxFailedAttempts - 1))}
                                    className="h-16 rounded-2xl flex flex-col gap-1 border-amber-100 hover:bg-amber-50/30 text-amber-700"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Harden limit</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-muted/20 border-t border-border">
                        <Button
                            onClick={fetchData}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
                        >
                            Sync Global Policies
                        </Button>
                    </div>
                </div>
            </div>

            {/* Recent Security Events */}
            <div className="bg-background rounded-3xl border border-border shadow-sm p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-muted-foreground" />
                        <h3 className="text-lg font-bold uppercase tracking-tight">Real-time Threat Monitor</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setPage(1); fetchData(); }} className="text-[9px] font-bold uppercase tracking-widest">Refresh Logs</Button>
                </div>

                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs font-medium border-2 border-dashed border-muted rounded-3xl">
                            No recent security anomalies detected.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {logs.map((log) => {
                                    const Icon = log.action.includes('Success') ? CheckCircle2 :
                                        log.action.includes('Failed') || log.action.includes('Blocked') ? AlertTriangle :
                                            log.action.includes('Locked') ? Lock : History;

                                    const color = log.status === 'Success' ? 'text-emerald-500' :
                                        log.status === 'Failure' ? 'text-red-500' : 'text-amber-500';

                                    return (
                                        <div key={log._id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("w-10 h-10 rounded-xl bg-muted flex items-center justify-center", color)}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm tracking-tight">{log.action}</div>
                                                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                                        {log.user?.name || log.userName || 'Unknown'} • {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                        {log.ipAddress && ` • IP: ${log.ipAddress}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge variant="outline" className={cn("text-[8px] font-black tracking-widest uppercase px-2",
                                                    log.status === 'Success' ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                                                        log.status === 'Failure' ? "border-red-200 text-red-700 bg-red-50" : ""
                                                )}>
                                                    {log.status}
                                                </Badge>
                                                <span className="text-[9px] text-muted-foreground font-medium max-w-[200px] truncate">
                                                    {log.details}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            <div className="pt-6 border-t border-border flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="h-8 w-8 p-0 rounded-lg"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="h-8 w-8 p-0 rounded-lg"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
