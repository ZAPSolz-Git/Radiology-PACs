import { useState, useEffect, useCallback } from 'react';
import {
    Download,
    Database,
    CheckCircle2,
    XCircle,
    Clock,
    ShieldCheck,
    AlertTriangle,
    Play,
    Trash2,
    Loader2,
    RefreshCcw,
    HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { BackupService, BackupRecord, BackupStats } from '../../services/BackupService';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function BackupManager() {
    const { toast } = useToast();
    const [backups, setBackups] = useState<BackupRecord[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [progress, setProgress] = useState(0);
    const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [backupData, statsData] = await Promise.all([
                BackupService.getAllBackups(),
                BackupService.getStats(),
            ]);
            setBackups(backupData);
            setStats(statsData);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to load backup data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Poll for in-progress backups
    useEffect(() => {
        const hasInProgress = backups.some(b => b.status === 'in-progress');
        if (!hasInProgress && !isBackingUp) return;

        const interval = setInterval(() => {
            fetchData();
        }, 3000);

        return () => clearInterval(interval);
    }, [backups, isBackingUp, fetchData]);

    const runManualBackup = async () => {
        setIsBackingUp(true);
        setProgress(0);

        // Simulate progress animation while the backup runs
        let p = 0;
        const progressInterval = setInterval(() => {
            p += Math.random() * 8;
            if (p >= 90) {
                p = 90; // Cap at 90% until we confirm success
                clearInterval(progressInterval);
            }
            setProgress(p);
        }, 600);

        try {
            await BackupService.triggerBackup();
            toast({
                title: 'Backup Started',
                description: 'A manual snapshot has been triggered. It will appear in the list shortly.',
            });

            // Wait a moment then refresh to see the new record
            setTimeout(async () => {
                clearInterval(progressInterval);
                setProgress(100);
                setTimeout(() => {
                    setIsBackingUp(false);
                    setProgress(0);
                    fetchData();
                }, 800);
            }, 2000);
        } catch (error: any) {
            clearInterval(progressInterval);
            setIsBackingUp(false);
            setProgress(0);
            toast({
                title: 'Backup Failed',
                description: error.response?.data?.message || 'Failed to trigger backup',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (backup: BackupRecord) => {
        try {
            await BackupService.deleteBackup(backup._id);
            toast({ title: 'Deleted', description: `Snapshot ${backup.backupId} has been permanently removed.` });
            fetchData();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to delete backup',
                variant: 'destructive',
            });
        }
        setDeleteTarget(null);
    };

    const handleDownload = async (backup: BackupRecord) => {
        try {
            const response = await api.get(`/backups/${backup._id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${backup.backupId}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            toast({
                title: 'Download Failed',
                description: error.response?.data?.message || 'Could not download backup',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Snapshot Vault...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <HardDrive className="w-8 h-8 text-indigo-600" />
                        Snapshot Vault
                    </h2>
                    <p className="text-sm font-medium text-muted-foreground mt-1">Database backup management & disaster recovery</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                    className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2"
                >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-background p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Vault Storage</p>
                        <h4 className="text-2xl font-black">{stats?.totalStorage || '0 KB'}</h4>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">{stats?.totalBackups || 0} Total Snapshots</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <Database className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-background p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                        <h4 className={cn("text-2xl font-black", stats?.health === 'Healthy' ? 'text-emerald-600' : stats?.health === 'Degraded' ? 'text-red-600' : 'text-amber-600')}>
                            {stats?.health || 'Unknown'}
                        </h4>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1 flex items-center gap-1">
                            {stats?.health === 'Healthy' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {stats?.healthDetail}
                        </p>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stats?.health === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl shadow-indigo-600/20 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Last Successful Backup</p>
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-black">
                            {stats?.lastBackupAt
                                ? new Date(stats.lastBackupAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Never'}
                        </h4>
                        <Clock className="w-6 h-6 text-white/50" />
                    </div>
                </div>
            </div>

            {/* Backup Progress */}
            {isBackingUp && (
                <div className="bg-background p-8 rounded-3xl border border-indigo-200 shadow-lg animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Performing Manual Snapshot...</h4>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Dumping and compressing database</p>
                            </div>
                        </div>
                        <span className="text-xs font-black text-indigo-600">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-indigo-50" />
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">Snapshot History</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Review and manage recent system states</p>
                </div>
                <Button
                    onClick={runManualBackup}
                    disabled={isBackingUp}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 gap-2"
                >
                    {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Trigger Manual Snapshot
                </Button>
            </div>

            {/* Backups Table */}
            <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 px-8">Snapshot ID</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Timestamp</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Size / Volume</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Job Status</TableHead>
                            <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right px-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {backups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">No snapshots taken yet</p>
                                </TableCell>
                            </TableRow>
                        ) : backups.map((bk) => (
                            <TableRow key={bk._id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="px-8 font-black text-xs text-indigo-600 font-mono tracking-tighter">{bk.backupId}</TableCell>
                                <TableCell>
                                    <div className="text-sm font-bold">
                                        {new Date(bk.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em]">
                                        {bk.type} Job · {new Date(bk.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs font-black text-foreground">{bk.size}</div>
                                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">{bk.retention} Retention</div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                        "font-black uppercase text-[9px] px-2.5 h-6 border-none",
                                        bk.status === 'success' ? "bg-emerald-500 text-white" :
                                            bk.status === 'failed' ? "bg-red-500 text-white" :
                                                "bg-amber-500 text-white"
                                    )}>
                                        {bk.status === 'success' ? <CheckCircle2 className="w-3 h-3 mr-1.5" /> :
                                            bk.status === 'failed' ? <XCircle className="w-3 h-3 mr-1.5" /> :
                                                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                                        {bk.status === 'in-progress' ? 'Running' : bk.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex justify-end gap-2">
                                        {bk.status === 'success' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(bk)}
                                                className="h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest gap-2 bg-background border-border hover:bg-muted group"
                                            >
                                                <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-indigo-600" />
                                                Download
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg"
                                            onClick={() => setDeleteTarget(bk)}
                                        >
                                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Restore Warning */}
            <div className="p-8 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/20">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-red-700">Data Recovery Policy</h4>
                    <p className="text-[11px] text-red-600 font-medium leading-relaxed max-w-2xl">
                        To restore a previous system state, download the snapshot archive and use <code className="bg-red-100 px-1.5 py-0.5 rounded text-[10px] font-mono">mongorestore</code> via the command line. This is a destructive action and will overwrite all clinical data generated after the snapshot timestamp. This action is restricted to Root Administrators.
                    </p>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black">Delete Snapshot {deleteTarget?.backupId}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the backup archive from the server. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTarget && handleDelete(deleteTarget)}
                            className="bg-red-600 hover:bg-red-500 font-black"
                        >
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
