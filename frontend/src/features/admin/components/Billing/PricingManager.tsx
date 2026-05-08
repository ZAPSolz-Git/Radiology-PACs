import { useState, useEffect } from 'react';
import {
    Plus,
    Edit3,
    Trash2,
    DollarSign,
    Globe,
    Hospital,
    User,
    Zap,
    Clock,
    Loader2,
    Upload,
    Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BillingService, PricingRule } from '../../services/BillingService';
import { toast } from 'sonner';
import { TariffModal } from './TariffModal';
import { AdminService } from '../../services/AdminService';

export function PricingManager() {
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<PricingRule | undefined>(undefined);
    const [bulkData, setBulkData] = useState('');
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [radiologists, setRadiologists] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState('all');

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const data = await BillingService.getTariffs();
            setRules(data);
        } catch (error) {
            toast.error("Failed to load tariff rules");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRadiologists = async () => {
        try {
            const users = await AdminService.getUsers({ role: 'radiologist' });
            const map: Record<string, string> = {};
            users.forEach(u => {
                map[u._id] = u.name;
            });
            setRadiologists(map);
        } catch (error) {
            console.error("Failed to load radiologists:", error);
        }
    };

    useEffect(() => {
        fetchRules();
        fetchRadiologists();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this pricing rule?")) return;
        try {
            await BillingService.deleteTariff(id);
            toast.success("Rule deleted successfully");
            fetchRules();
        } catch (error) {
            toast.error("Failed to delete rule");
        }
    };

    const handleToggleStatus = async (rule: PricingRule) => {
        if (!rule._id) return;
        const newStatus = rule.isActive === false;
        try {
            await BillingService.updateTariff(rule._id, { isActive: newStatus });
            toast.success(`Rule ${newStatus ? 'activated' : 'deactivated'}`);
            setRules(prev => prev.map(r => r._id === rule._id ? { ...r, isActive: newStatus } : r));
        } catch (error) {
            toast.error("Failed to toggle status");
        }
    };

    const handleEdit = (rule: PricingRule) => {
        setEditingRule(rule);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingRule(undefined);
        setIsModalOpen(true);
    };

    const handleSave = async (data: PricingRule) => {
        try {
            if (editingRule && editingRule._id) {
                await BillingService.updateTariff(editingRule._id, data);
                toast.success("Rule updated successfully");
            } else {
                await BillingService.createTariff(data);
                toast.success("Rule created successfully");
            }
            setIsModalOpen(false);
            fetchRules();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save rule");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const extension = file.name.split('.').pop()?.toLowerCase();

        reader.onload = (event) => {
            try {
                if (extension === 'json') {
                    const content = event.target?.result as string;
                    JSON.parse(content); // Validate
                    setBulkData(content);
                    toast.success("JSON file loaded successfully");
                } else if (['xlsx', 'xls', 'csv'].includes(extension || '')) {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: null,
                        header: ["modality", "studyType", "basePrice", "emergencySurcharge", "nightHolidaySurcharge", "targetHospitalId", "targetRadiologistId"],
                        range: 1 // Skip headers
                    });

                    // Filter out empty rows and format numbers
                    const cleaned = jsonData.filter((row: any) => row.modality && row.studyType).map((row: any) => ({
                        modality: String(row.modality).toUpperCase(),
                        studyType: String(row.studyType),
                        basePrice: Number(row.basePrice || 0),
                        emergencySurcharge: Number(row.emergencySurcharge || 0),
                        nightHolidaySurcharge: Number(row.nightHolidaySurcharge || 0),
                        targetHospitalId: row.targetHospitalId || null,
                        targetRadiologistId: row.targetRadiologistId || null,
                        isActive: true
                    }));

                    setBulkData(JSON.stringify(cleaned, null, 2));
                    toast.success(`Excel processed: ${cleaned.length} rules found`);
                }
            } catch (err) {
                console.error("Parse Error:", err);
                toast.error("Failed to parse file. Please use the standardized template.");
            }
        };

        if (extension === 'json') {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    };

    const downloadTemplate = (format: 'json' | 'xlsx') => {
        const templateData = [
            {
                modality: "CT",
                studyType: "Head WO Contrast",
                basePrice: 1200,
                emergencySurcharge: 200,
                nightHolidaySurcharge: 300,
                targetHospitalId: "optional_hospital_name",
                targetRadiologistId: "optional_doctor_id"
            },
            {
                modality: "MRI",
                studyType: "Brain W/WO Contrast",
                basePrice: 4500,
                emergencySurcharge: 500,
                nightHolidaySurcharge: 750,
                targetHospitalId: null,
                targetRadiologistId: null
            }
        ];

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tariff_template.json';
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Pricing Rules");
            XLSX.writeFile(workbook, "tariff_template.xlsx");
        }
        toast.success(`${format.toUpperCase()} template downloaded`);
    };

    const handleBulkImport = async () => {
        if (!bulkData.trim()) return;
        setIsProcessingBulk(true);
        try {
            // Simple JSON parser for now, CSV could be added later
            const parsed = JSON.parse(bulkData);
            if (!Array.isArray(parsed)) throw new Error("Data must be an array of objects");

            await BillingService.bulkCreate(parsed);
            toast.success(`Imported ${parsed.length} rules`);
            setIsBulkModalOpen(false);
            setBulkData('');
            fetchRules();
        } catch (error: any) {
            toast.error(error.message || "Bulk import failed. Please check JSON format.");
        } finally {
            setIsProcessingBulk(false);
        }
    };

    const filteredRules = rules.filter(r => {
        if (activeTab === 'all') return true;
        if (activeTab === 'global') return !r.targetHospitalId && !r.targetRadiologistId;
        if (activeTab === 'hospitals') return !!r.targetHospitalId && !r.targetRadiologistId;
        return r.targetRadiologistId === activeTab;
    });



    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="bg-muted/50 p-1 h-12 rounded-2xl gap-1 overflow-x-auto no-scrollbar max-w-[calc(100vw-450px)] flex-row justify-start">
                        <TabsTrigger value="all" className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">All Rules</TabsTrigger>
                        <TabsTrigger value="global" className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Global</TabsTrigger>
                        <TabsTrigger value="hospitals" className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Hospitals</TabsTrigger>
                        {Object.entries(radiologists).filter(([id]) => rules.some(r => r.targetRadiologistId === id)).map(([id, name]) => (
                            <TabsTrigger key={id} value={id} className="rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">
                                Dr. {name.split(' ')[0]}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsBulkModalOpen(true)}
                        className="h-10 px-4 rounded-xl font-bold uppercase text-[10px] tracking-widest border-slate-200 text-white hover:bg-slate-50 hover:text-indigo-600 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Bulk Import
                    </Button>
                    <Button
                        onClick={handleCreate}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Rule
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-indigo-30/30 border border-indigo-100 rounded-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Global Rules</h4>
                    </div>
                    <div className="text-2xl font-black relative z-10">{rules.filter(r => !r.targetHospitalId && r.isActive !== false).length} Active</div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1 relative z-10">Base rates for all modalities</p>
                    <Globe className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-600/5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6 bg-amber-30/30 border border-amber-100 rounded-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <Hospital className="w-5 h-5 text-amber-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Institutional Overrides</h4>
                    </div>
                    <div className="text-2xl font-black relative z-10">{rules.filter(r => r.targetHospitalId && r.isActive !== false).length} Active</div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1 relative z-10">Custom contracts for hospitals</p>
                    <Hospital className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-600/5 group-hover:scale-110 transition-transform" />
                </div>
                <div className="p-6 bg-purple-30/30 border border-purple-100 rounded-2xl relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <User className="w-5 h-5 text-purple-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600">Doctor Specific</h4>
                    </div>
                    <div className="text-2xl font-black relative z-10">{rules.filter(r => r.targetRadiologistId && r.isActive !== false).length} Active</div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1 relative z-10">Special payout arrangements</p>
                    <User className="absolute -right-4 -bottom-4 w-24 h-24 text-purple-600/5 group-hover:scale-110 transition-transform" />
                </div>
            </div>

            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Tariff Data...</p>
                    </div>
                ) : filteredRules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                        <DollarSign className="w-12 h-12 text-muted-foreground opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No rules match this filter</p>
                        <Button variant="outline" size="sm" onClick={handleCreate} className="mt-2">Add New Rule</Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Status</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Modality</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Study / Procedure</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Base Rate</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Surcharges</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Scope</TableHead>
                                <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRules.map((rule) => (
                                <TableRow key={rule._id} className={cn(
                                    "hover:bg-muted/50 transition-colors",
                                    rule.isActive === false && "opacity-50 grayscale-[0.5]"
                                )}>
                                    <TableCell>
                                        <button
                                            onClick={() => handleToggleStatus(rule)}
                                            className={cn(
                                                "w-10 h-5 rounded-full relative transition-colors duration-200 outline-none",
                                                rule.isActive !== false ? "bg-green-500" : "bg-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200",
                                                rule.isActive !== false ? "left-6" : "left-1"
                                            )} />
                                        </button>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "font-black uppercase text-[9px]",
                                            rule.modality === 'CT' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                rule.modality === 'MRI' ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                    "bg-slate-50 text-slate-700 border-slate-200"
                                        )}>
                                            {rule.modality}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold text-sm text-foreground">{rule.studyType}</TableCell>
                                    <TableCell className="font-black text-indigo-600">₹{rule.basePrice}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                                <Zap className="w-3 h-3" />
                                                +{rule.emergencySurcharge}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                                                <Clock className="w-3 h-3" />
                                                +{rule.nightHolidaySurcharge}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {rule.targetRadiologistId && (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 text-[9px] uppercase font-bold">
                                                    Dr. {radiologists[rule.targetRadiologistId] || 'Assigned Doctor'}
                                                </Badge>
                                            )}
                                            {rule.targetHospitalId ? (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-[9px] uppercase font-bold">
                                                    {rule.targetHospitalId}
                                                </Badge>
                                            ) : !rule.targetRadiologistId && (
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[9px] uppercase font-bold">
                                                    Global
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(rule)}
                                                className="w-8 h-8 text-muted-foreground hover:text-indigo-600"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(rule._id!)}
                                                className="w-8 h-8 text-muted-foreground hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Bulk Import Modal */}
            <TariffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                rule={editingRule}
                onSave={handleSave}
            />

            {/* Bulk Import Dialog */}
            <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col bg-background">
                    <DialogHeader className="p-6 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shrink-0">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Bulk Tariff Import</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 sm:py-6 custom-scrollbar space-y-6">
                        <div className="p-6 rounded-2xl bg-background border border-slate-200 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Standardized Templates</h4>
                                    <p className="text-[10px] text-muted-foreground mt-1">Download formats to ensure correct data mapping</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadTemplate('json')}
                                        className="h-8 rounded-lg border-slate-200 font-bold uppercase text-[9px] gap-2 hover:bg-indigo-600 shadow-sm"
                                    >
                                        <Download className="w-3 h-3" />
                                        JSON Format
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadTemplate('xlsx')}
                                        className="h-8 rounded-lg border-slate-200 font-bold uppercase text-[9px] gap-2 hover:bg-indigo-600 shadow-sm"
                                    >
                                        <Download className="w-3 h-3" />
                                        Excel Format
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600">Import File</h4>
                                    <p className="text-[10px] text-muted-foreground mt-1">Supports .json, .xlsx, .xls, .csv</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        id="bulk-file-upload"
                                        className="hidden"
                                        accept=".json,.xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        onClick={() => document.getElementById('bulk-file-upload')?.click()}
                                        className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload File
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manual Editor / Preview</Label>
                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-indigo-100 text-indigo-600">Advanced JSON Mode</Badge>
                            </div>
                            <textarea
                                value={bulkData}
                                onChange={(e) => setBulkData(e.target.value)}
                                placeholder='[{"modality": "CT", "studyType": "Head", "basePrice": 1200}, ...]'
                                className="w-full h-72 p-6 rounded-2xl border-none bg-muted/50 font-mono text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                            <div className="p-2 bg-indigo-100 rounded-lg"><Zap className="w-5 h-5 text-indigo-600" /></div>
                            <div>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Pro Tip</h5>
                                <p className="text-[10px] text-indigo-900/90 mt-0.5 font-medium leading-normal">Use this to bulk sync prices from Excel or other systems. Existing rules with matching modality/study/hospital will be updated.</p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 border-t border-border flex gap-3 shrink-0 bg-background">
                        <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkImport}
                            disabled={isProcessingBulk || !bulkData.trim()}
                            className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20"
                        >
                            {isProcessingBulk ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Start Import'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
