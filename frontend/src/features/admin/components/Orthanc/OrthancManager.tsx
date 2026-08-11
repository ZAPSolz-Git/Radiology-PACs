import { useState, useEffect, useMemo } from 'react';
import { OrthancService, OrthancStudy, OrthancStats } from '../../services/OrthancService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Server, AlertTriangle, Search, Trash2,
    RefreshCw, HardDrive, FileImage, User, Calendar, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function OrthancManager() {
    const [studies, setStudies] = useState<OrthancStudy[]>([]);
    const [stats, setStats] = useState<OrthancStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'orphaned'>('all');

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Delete Confirmation
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [cascadeDelete, setCascadeDelete] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [studiesData, statsData] = await Promise.all([
                OrthancService.getStudies(),
                OrthancService.getStats()
            ]);
            setStudies(studiesData);
            setStats(statsData);
            // Clear selections on refresh
            setSelectedIds(new Set());
        } catch (err) {
            toast.error("Failed to connect to PACS server");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredStudies = useMemo(() => {
        return studies.filter(study => {
            const matchesSearch =
                (study.patientName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (study.patientId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (study.studyInstanceUID?.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesFilter = filterStatus === 'all'
                ? true
                : filterStatus === 'linked'
                    ? study.isLinked
                    : !study.isLinked;

            return matchesSearch && matchesFilter;
        });
    }, [studies, searchQuery, filterStatus]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredStudies.map(s => s.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSet = new Set(selectedIds);
        if (checked) newSet.add(id);
        else newSet.delete(id);
        setSelectedIds(newSet);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        setIsDeleting(true);
        try {
            const ids = Array.from(selectedIds);
            const successCount = await OrthancService.bulkDeleteStudies(ids, cascadeDelete);

            if (successCount === ids.length) {
                toast.success(`Successfully deleted ${successCount} studies from PACS`);
            } else {
                toast.warning(`Deleted ${successCount} out of ${ids.length} studies`);
            }

            setIsDeleteDialogOpen(false);
            fetchData();
        } catch (err) {
            toast.error("An error occurred during bulk deletion");
        } finally {
            setIsDeleting(false);
        }
    };

    const openInOHIF = (studyInstanceUID: string, e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`http://localhost:3000/viewer?StudyInstanceUIDs=${studyInstanceUID}`, '_blank');
    };

    // Format DICOM date (YYYYMMDD to readable)
    const formatDicomDate = (dicomDate: string) => {
        if (!dicomDate || dicomDate.length !== 8) return dicomDate;
        try {
            const year = dicomDate.substring(0, 4);
            const month = dicomDate.substring(4, 6);
            const day = dicomDate.substring(6, 8);
            return format(new Date(`${year}-${month}-${day}`), 'MMM dd, yyyy');
        } catch (e) {
            return dicomDate;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                        <Server className="w-5 h-5 text-indigo-500" />
                        PACS Vault
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                        Direct connection to local Orthanc internal storage
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={isLoading}
                        className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        <RefreshCw className={cn("w-3 h-3 mr-2", isLoading && "animate-spin")} />
                        Refresh Synapse
                    </Button>
                    {selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-500/20"
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Purge Data ({selectedIds.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* Storage Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-row items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Storage</span>
                            <HardDrive className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="text-2xl font-black">{stats.totalDiskSizeMB} <span className="text-base font-bold text-muted-foreground">MB</span></div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-medium">Physical disk usage</div>
                    </div>

                    <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-row items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Archived Studies</span>
                            <FileImage className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="text-2xl font-black">{stats.countStudies}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-medium">Total DICOM studies</div>
                    </div>

                    <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                        <div className="flex flex-row items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Instances</span>
                            <Server className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black">{stats.countInstances.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-medium">Individual image slice count</div>
                    </div>

                    <div className="bg-background p-5 rounded-2xl border border-border shadow-sm border-amber-500/20 bg-amber-500/5">
                        <div className="flex flex-row items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Orphaned Studies</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-600">
                            {studies.filter(s => !s.isLinked).length}
                        </div>
                        <div className="text-[10px] text-amber-600/70 mt-1 font-bold">Unlinked to platform Cases</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-background border border-border p-3 rounded-2xl flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Patient Name, ID, or Study UID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-none h-10 rounded-xl w-full"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar shrink-0">
                    <Button
                        variant={filterStatus === 'all' ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                        className="rounded-xl px-4 h-10 shadow-none font-bold text-[11px] uppercase tracking-wider"
                    >
                        All Data
                    </Button>
                    <Button
                        variant={filterStatus === 'linked' ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterStatus('linked')}
                        className={cn(
                            "rounded-xl px-4 h-10 shadow-none font-bold text-[11px] uppercase tracking-wider",
                            filterStatus === 'linked' && "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                    >
                        Linked DB Cases
                    </Button>
                    <Button
                        variant={filterStatus === 'orphaned' ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setFilterStatus('orphaned')}
                        className={cn(
                            "rounded-xl px-4 h-10 shadow-none font-bold text-[11px] uppercase tracking-wider",
                            filterStatus === 'orphaned' && "bg-amber-500 hover:bg-amber-400 text-white"
                        )}
                    >
                        Orphaned PACS Only
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">
                                    <Checkbox
                                        checked={selectedIds.size === filteredStudies.length && filteredStudies.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        className="rounded-md data-[state=checked]:bg-indigo-600"
                                    />
                                </th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Patient</th>
                                <th className="px-5 py-4">Study Date</th>
                                <th className="px-5 py-4">Description</th>
                                <th className="px-5 py-4 text-center">Series</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <div className="inline-flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Reading DICOM indexes...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudies.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
                                        No studies matched your filters
                                    </td>
                                </tr>
                            ) : (
                                filteredStudies.map((study) => (
                                    <tr key={study.id} className={cn(
                                        "hover:bg-muted/50 transition-colors",
                                        selectedIds.has(study.id) && "bg-indigo-50/50 dark:bg-indigo-500/10"
                                    )}>
                                        <td className="px-5 py-4 text-center">
                                            <Checkbox
                                                checked={selectedIds.has(study.id)}
                                                onCheckedChange={(checked) => handleSelectRow(study.id, !!checked)}
                                                className="rounded-md data-[state=checked]:bg-indigo-600"
                                            />
                                        </td>
                                        <td className="px-5 py-4">
                                            {study.isLinked ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Linked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Orphan
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground">{study.patientName || 'Unknown Patient'}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">ID: {study.patientId || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                <span className="font-medium text-[13px]">{formatDicomDate(study.studyDate)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-medium max-w-[200px] truncate text-[13px]">
                                                {study.studyDescription || 'No description provided'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5 truncate max-w-[200px]">
                                                {study.studyInstanceUID}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                                                {study.seriesCount}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => openInOHIF(study.studyInstanceUID, e)}
                                                    className="w-8 h-8 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                                    title="View in OHIF Viewer"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Danger Zone Delete Confirmation Modal */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="border-red-500/20 max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                            Purge PACS Data
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                            You are about to permanently delete <strong>{selectedIds.size} studies</strong> from the Orthanc hardware server. This action cannot be undone and will break any viewers trying to access this data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="my-4 p-4 rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/5">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="cascade"
                                checked={cascadeDelete}
                                onCheckedChange={(v) => setCascadeDelete(!!v)}
                                className="mt-1 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="cascade"
                                    className="text-sm font-bold text-red-900 dark:text-red-400 cursor-pointer"
                                >
                                    Cascade Delete DB Cases
                                </label>
                                <p className="text-xs text-red-700/80 dark:text-red-400/80 leading-snug">
                                    If checked, any MongoDB Case records linked to these studies will also be destroyed to prevent orphaned database rows.
                                </p>
                            </div>
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-10 px-6">Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
                        >
                            {isDeleting ? 'Erasing Tape...' : 'Acknowledge & Purge'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
