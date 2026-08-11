import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Activity,
    Plus,
    Trash2,
    CheckCircle2,
    Server,
    Zap,
    Loader2,
    Smartphone,
    Monitor,
    Edit2Icon
} from 'lucide-react';
import { CaseService } from '../services/CaseService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PacsSettings() {
    const [sites, setSites] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State for New/Edit Site
    const [showForm, setShowForm] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        siteId: '',
        scpAETitle: '',
        scpIP: '',
        scpPort: '104',
        scuAETitle: 'MY_RADIOLOGY_SCU',
        scuPort: '4243',
        scuIP: '127.0.0.1',
    });

    const [serverInfo, setServerInfo] = useState<{ localIp: string; scuPort: string } | null>(null);

    const fetchSites = async () => {
        setIsLoading(true);
        try {
            const data = await CaseService.getSites();
            setSites(data);
        } catch (err) {
            toast.error("Failed to load PACS configurations");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchServerInfo = async () => {
        try {
            const info = await CaseService.getServerInfo();
            setServerInfo(info);
            // Pre-fill scuIP if it's currently default and we have a real IP
            if (!editingSiteId && formData.scuIP === '127.0.0.1' && info.localIp !== '127.0.0.1') {
                setFormData(prev => ({ ...prev, scuIP: info.localIp }));
            }
        } catch (err) {
            console.error("Failed to fetch server info", err);
        }
    };

    useEffect(() => {
        fetchSites();
        fetchServerInfo();
    }, []);

    const handleTestConnection = async (site?: any) => {
        const testData = site ? { siteId: site.siteId } : {
            scpAETitle: formData.scpAETitle,
            scpIP: formData.scpIP,
            scpPort: formData.scpPort,
            scuAETitle: formData.scuAETitle,
            scuIP: formData.scuIP
        };

        const id = site?.siteId || 'new';
        setIsTesting(id);

        try {
            const result = await CaseService.testPacsConnection(testData);
            toast.success(`C-ECHO Success! Latency: ${result.latency}`);
            if (site) fetchSites(); // Refresh lastPing
        } catch (err: any) {
            toast.error(`C-ECHO Failed: ${err.response?.data?.message || 'Connection Refused'}`);
        } finally {
            setIsTesting(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingSiteId) {
                await CaseService.updatePacsSite(editingSiteId, formData);
                toast.success("Site updated successfully");
            } else {
                await CaseService.createPacsSite(formData);
                toast.success("Site created successfully");
            }
            setShowForm(false);
            setEditingSiteId(null);
            fetchSites();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to save configuration");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (siteId: string) => {
        if (!confirm("Are you sure? This site will no longer be available for patient imports.")) return;
        try {
            await CaseService.deletePacsSite(siteId);
            toast.success("Site deactivated");
            fetchSites();
        } catch (err) {
            toast.error("Failed to delete site");
        }
    };

    const openEdit = (site: any) => {
        setFormData({
            name: site.name,
            siteId: site.siteId,
            scpAETitle: site.scpAETitle,
            scpIP: site.scpIP,
            scpPort: site.scpPort.toString(),
            scuAETitle: site.scuAETitle,
            scuPort: site.scuPort?.toString() || '4243',
            scuIP: site.scuIP || '127.0.0.1',
        });
        setEditingSiteId(site.siteId);
        setShowForm(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>

                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        Configure SCP/SCU Association Parameters for Hospital PACS
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => {
                            setFormData({
                                name: '', siteId: '', scpAETitle: '', scpIP: '',
                                scpPort: '104', scuAETitle: 'MY_RADIOLOGY_SCU', scuPort: '4243',
                                scuIP: '127.0.0.1'
                            });
                            setEditingSiteId(null);
                            setShowForm(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-black uppercase text-[10px]"
                    >
                        <Plus className="w-4 h-4" />
                        Connect New Site
                    </Button>
                )}
            </div>

            {showForm ? (
                <Card className="border-2 border-indigo-500/20 bg-indigo-50/5 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase">{editingSiteId ? 'Modify Configuration' : 'New PACS Endpoint'}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold">Establishing peer DICOM relationship</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Left Side: Logistics */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/20 rounded-2xl border border-border space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">General Identity</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] uppercase font-black">Display Name</Label>
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. City Hospital PACS"
                                                className="bg-background border-border h-10 font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] uppercase font-black">Site ID (Unique Code)</Label>
                                            <Input
                                                value={formData.siteId}
                                                onChange={e => setFormData({ ...formData, siteId: e.target.value.toUpperCase() })}
                                                placeholder="e.g. CITY01"
                                                className="bg-background border-border h-10 font-bold"
                                                disabled={!!editingSiteId}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-4">
                                        <span className="text-[10px] text-blue-500 uppercase tracking-widest">System </span>

                                        <div className="flex items-center gap-2 mb-2">
                                            <Monitor className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Our SCU (Local Client)</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] uppercase font-black">Local AE Title</Label>
                                                <Input
                                                    value={formData.scuAETitle}
                                                    onChange={e => setFormData({ ...formData, scuAETitle: e.target.value })}
                                                    className="bg-background border-border h-10 font-bold"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] uppercase font-black">Local Port (C-STORE)</Label>
                                                <Input
                                                    value={formData.scuPort}
                                                    onChange={e => setFormData({ ...formData, scuPort: e.target.value })}
                                                    className="bg-background border-border h-10 font-bold"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[9px] uppercase font-black">Local IP (Our Server)</Label>
                                                {serverInfo && serverInfo.localIp !== formData.scuIP && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, scuIP: serverInfo.localIp })}
                                                        className="text-[8px] font-black uppercase text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100 transition-all"
                                                    >
                                                        Use Server IP: {serverInfo.localIp}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    value={formData.scuIP}
                                                    onChange={e => setFormData({ ...formData, scuIP: e.target.value })}
                                                    placeholder="127.0.0.1"
                                                    className="bg-background border-border h-10 font-bold pr-20"
                                                    required
                                                />
                                                {serverInfo && serverInfo.localIp === formData.scuIP && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                        System Verified
                                                    </div>
                                                )}
                                            </div>
                                            {serverInfo && (
                                                <p className="text-[8px] text-muted-foreground font-medium italic mt-1">
                                                    Detected system IP: <span className="font-bold text-indigo-500">{serverInfo.localIp}</span>. Provide this to the PACS administrator.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Remote PACS */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 space-y-4">
                                        <span className="text-[10px] text-green-500 uppercase tracking-widest">Hospital    </span>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Server className="w-4 h-4 text-red-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Remote SCP (PACS Server)</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] uppercase font-black">PACS AE Title</Label>
                                            <Input
                                                value={formData.scpAETitle}
                                                onChange={e => setFormData({ ...formData, scpAETitle: e.target.value })}
                                                placeholder="e.g. PACS_SERVER"
                                                className="bg-background border-border h-10 font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] uppercase font-black">PACS IP Address</Label>
                                                <Input
                                                    value={formData.scpIP}
                                                    onChange={e => setFormData({ ...formData, scpIP: e.target.value.trim() })}
                                                    placeholder="192.168.1.100"
                                                    className="bg-background border-border h-10 font-bold"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] uppercase font-black">PACS Port</Label>
                                                <Input
                                                    value={formData.scpPort}
                                                    onChange={e => setFormData({ ...formData, scpPort: e.target.value })}
                                                    placeholder="104"
                                                    className="bg-background border-border h-10 font-bold"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col h-full justify-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleTestConnection()}
                                            disabled={isTesting === 'new'}
                                            className="h-12 rounded-xl font-bold gap-2 text-[11px] border-amber-500/30 text-amber-600 hover:bg-amber-30/50"
                                        >
                                            {isTesting === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                                            Test DIMSE Handshake
                                        </Button>
                                        <p className="text-[9px] text-muted-foreground text-center italic font-medium px-4">
                                            C-ECHO validation ensures AE Titles and IP/Port connectivity are correctly configured before saving.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowForm(false)}
                                    className="font-black uppercase text-[10px]"
                                >
                                    Discard
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[120px] font-black uppercase text-[10px]"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Commit Configuration'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isLoading ? (
                        <div className="col-span-full h-48 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                        </div>
                    ) : (
                        sites.map(site => (
                            <Card key={site.siteId} className="group hover:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-xl bg-card">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">{site.name}</CardTitle>
                                        <CardDescription className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{site.siteId}</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(site)} className="h-8 w-8 text-muted-foreground hover:text-indigo-600">
                                            <Edit2Icon className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(site.siteId)} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Remote (SCP)</div>
                                            <div className="text-[11px] font-bold flex items-center gap-1.5">
                                                <Server className="w-3 h-3 text-red-500" />
                                                {site.scpAETitle}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium">{site.scpIP}:{site.scpPort}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Local (SCU)</div>
                                            <div className="text-[11px] font-bold flex items-center gap-1.5">
                                                <Monitor className="w-3 h-3 text-indigo-500" />
                                                {site.scuAETitle}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium">{site.scuIP || '127.0.0.1'}:{site.scuPort || '4242'}</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                site.lastPing ? "bg-green-500" : "bg-muted animate-pulse"
                                            )} />
                                            <span className="text-[9px] font-black uppercase text-muted-foreground">
                                                {site.lastPing ? `Last ping: ${new Date(site.lastPing).toLocaleTimeString()}` : 'Never Tested'}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleTestConnection(site)}
                                            disabled={isTesting === site.siteId}
                                            className="h-7 text-[9px] font-black uppercase tracking-tighter rounded-lg"
                                        >
                                            {isTesting === site.siteId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Activity className="w-3 h-3 mr-1 text-amber-500" />}
                                            C-ECHO
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {!isLoading && sites.length === 0 && (
                        <div className="col-span-full h-64 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-muted/5">
                            <Smartphone className="w-12 h-12 text-muted-foreground/20 mb-4" />
                            <h3 className="font-black uppercase tracking-widest text-sm text-muted-foreground/60">No PACS Endpoints Defined</h3>
                            <p className="text-[11px] text-muted-foreground font-medium max-w-xs mt-2">
                                Hospital sites must be configured before you can perform C-FIND queries or C-MOVE imports.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
