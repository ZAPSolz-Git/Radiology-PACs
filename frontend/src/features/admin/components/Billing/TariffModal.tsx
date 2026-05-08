import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PricingRule } from '../../services/BillingService';
import { AdminService } from '../../services/AdminService';
import { AdminUser } from '../../types';

interface TariffModalProps {
    isOpen: boolean;
    onClose: () => void;
    rule?: PricingRule;
    onSave: (data: PricingRule) => void;
}

export function TariffModal({ isOpen, onClose, rule, onSave }: TariffModalProps) {
    const [formData, setFormData] = useState<PricingRule>({
        modality: 'CT',
        studyType: '',
        basePrice: 0,
        emergencySurcharge: 0,
        nightHolidaySurcharge: 0,
        targetHospitalId: '',
        targetRadiologistId: null,
    });

    const [radiologists, setRadiologists] = useState<AdminUser[]>([]);
    const [institutions, setInstitutions] = useState<AdminUser[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rads, insts] = await Promise.all([
                    AdminService.getUsers({ role: 'radiologist' }),
                    AdminService.getUsers({ role: 'institution' })
                ]);
                setRadiologists(rads);
                setInstitutions(insts);
            } catch (error) {
                console.error("Failed to fetch scoped data:", error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (rule) {
            setFormData({
                ...rule,
                targetHospitalId: rule.targetHospitalId || '',
                targetRadiologistId: rule.targetRadiologistId || null,
            });
        } else {
            setFormData({
                modality: 'CT',
                studyType: '',
                basePrice: 0,
                emergencySurcharge: 0,
                nightHolidaySurcharge: 0,
                targetHospitalId: '',
                targetRadiologistId: null,
            });
        }
    }, [rule, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[520px] max-h-[90vh] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col bg-background">
                <DialogHeader className="p-6 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shrink-0">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        {rule ? 'Edit Tariff Rule' : 'Create New Tariff Rule'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 sm:py-6 custom-scrollbar space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modality</Label>
                                <Select
                                    value={formData.modality}
                                    onValueChange={(value) => setFormData({ ...formData, modality: value })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-muted bg-muted/30">
                                        <SelectValue placeholder="Select modality" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["CT", "MRI", "X-Ray", "US", "PET-CT", "MG", "BMD", "OTHERS"].map((m) => (
                                            <SelectItem key={m} value={m} className="font-bold uppercase text-[10px]">{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Study / Procedure</Label>
                                <Input
                                    value={formData.studyType}
                                    onChange={(e) => setFormData({ ...formData, studyType: e.target.value })}
                                    placeholder="e.g. Brain WO Contrast"
                                    className="h-11 rounded-xl border-muted bg-muted/30 font-bold"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-4 p-4 rounded-2xl bg-indigo-30/30 border border-indigo-100">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-2">Pricing Configuration (INR)</Label>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold text-muted-foreground">Base Price</Label>
                                    <Input
                                        type="number"
                                        value={formData.basePrice || ''}
                                        onChange={(e) => setFormData({ ...formData, basePrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className="h-10 rounded-lg border-indigo-200 font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold text-muted-foreground">Emergency (+)</Label>
                                    <Input
                                        type="number"
                                        value={formData.emergencySurcharge || ''}
                                        onChange={(e) => setFormData({ ...formData, emergencySurcharge: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className="h-10 rounded-lg border-red-200 font-bold text-red-600 text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-bold text-muted-foreground">Night/Holiday (+)</Label>
                                    <Input
                                        type="number"
                                        value={formData.nightHolidaySurcharge || ''}
                                        onChange={(e) => setFormData({ ...formData, nightHolidaySurcharge: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className="h-10 rounded-lg border-amber-200 font-bold text-amber-600 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-muted bg-muted/10">
                                <div>
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground block">Active Status</Label>
                                    <p className="text-[9px] text-muted-foreground mt-1">Inactive rules will be ignored during billing matching.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant={formData.isActive !== false ? 'default' : 'outline'}
                                    onClick={() => setFormData({ ...formData, isActive: formData.isActive === false })}
                                    className={cn(
                                        "h-8 px-4 rounded-lg font-bold text-[9px] uppercase tracking-tighter",
                                        formData.isActive !== false ? "bg-green-600 hover:bg-green-500" : "text-muted-foreground"
                                    )}
                                >
                                    {formData.isActive !== false ? 'Active' : 'Inactive'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Institutional Scope (Optional)</Label>
                                    <Select
                                        value={formData.targetHospitalId || "global"}
                                        onValueChange={(val) => setFormData({ ...formData, targetHospitalId: val === "global" ? null : val })}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-muted bg-muted/30">
                                            <SelectValue placeholder="All Institutions" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                            <SelectItem value="global" className="font-bold uppercase text-[10px]">All Institutions</SelectItem>
                                            {institutions.map(inst => (
                                                <SelectItem key={inst._id} value={inst.name} className="font-bold uppercase text-[10px]">{inst.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Radiologist Scope (Optional)</Label>
                                    <Select
                                        value={formData.targetRadiologistId || "global"}
                                        onValueChange={(val) => setFormData({ ...formData, targetRadiologistId: val === "global" ? null : val })}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-muted bg-muted/30">
                                            <SelectValue placeholder="All Radiologists" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global" className="font-bold uppercase text-[10px]">All Radiologists</SelectItem>
                                            {radiologists.map(r => (
                                                <SelectItem key={r._id} value={r._id} className="font-bold uppercase text-[10px]">{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground italic">Leave scopes empty to apply this price globally for all hospitals and doctors.</p>
                        </div>

                    </div>

                    <DialogFooter className="p-6 sm:p-8 border-t border-border flex gap-3 shrink-0 bg-background">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20">
                            {rule ? 'Update Rule' : 'Create Rule'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
