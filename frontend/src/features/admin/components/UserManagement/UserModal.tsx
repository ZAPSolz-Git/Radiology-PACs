import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { AdminUser, AdminUserRole } from '../../types';
import { toast } from 'sonner';
import { AdminService } from '../../services/AdminService';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<AdminUser>) => void;
    user?: AdminUser | null;
}

export function UserModal({ isOpen, onClose, onSubmit, user }: UserModalProps) {
    const [formData, setFormData] = useState<Partial<AdminUser & { password?: string, institution?: string }>>({
        name: '',
        email: '',
        password: '',
        role: 'technician',
        status: 'active',
        institution: '',
        phoneNumber: '',
    });

    const [institutions, setInstitutions] = useState<AdminUser[]>([]);
    const [isLoadingInst, setIsLoadingInst] = useState(false);

    useEffect(() => {
        const loadInstitutions = async () => {
            try {
                setIsLoadingInst(true);
                const data = await AdminService.getUsers({ role: 'institution' });
                setInstitutions(data);
            } catch (err) {
                console.error('Failed to fetch institutions:', err);
                toast.error('Failed to load institution list');
            } finally {
                setIsLoadingInst(false);
            }
        };

        if (isOpen) {
            loadInstitutions();
        }
    }, [isOpen]);

    useEffect(() => {
        if (user) {
            setFormData(user);
        } else {
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'technician',
                status: 'active',
                institution: '',
                phoneNumber: '',
            });
        }
    }, [user, isOpen]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[520px] max-h-[90vh] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
                <DialogHeader className="p-6 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shrink-0">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                        {user ? 'Modify Operator' : 'Onboard New Operator'}
                    </DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium">
                        {user ? 'Update credentials and access levels for existing personnel.' : 'Initialize system access for a new radiology professional.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-background">
                    <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 sm:py-6 custom-scrollbar">
                        <div className="space-y-6 pb-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Legal Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Dr. John Smith"
                                    className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email Address</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john.smith@radiology.com"
                                    className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    required
                                />
                            </div>

                            {!user && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Password</Label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Min 6 chars, uppercase, lowercase, special"
                                        className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                        required
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">System Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(val) => setFormData({ ...formData, role: val as AdminUserRole })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            <SelectValue placeholder="Select Role" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="radiologist">Radiologist</SelectItem>
                                            <SelectItem value="technician">Technician</SelectItem>
                                            <SelectItem value="qa">Quality Analyzer</SelectItem>
                                            <SelectItem value="institution">Institution (Hospital)</SelectItem>
                                            <SelectItem value="user">User</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Account Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({ ...formData, status: val as any })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="deactivated">Deactivated</SelectItem>
                                            <SelectItem value="locked">Locked</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {formData.role === 'technician' && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        Associated Hospital/Center
                                    </Label>
                                    <Select
                                        value={formData.institution}
                                        onValueChange={(val) => setFormData({ ...formData, institution: val })}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                            <SelectValue placeholder="Select Hospital" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                            {institutions.length === 0 ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">No institutions found</p>
                                                    <p className="text-[9px] text-muted-foreground italic">Add a user with 'Institution' role first.</p>
                                                </div>
                                            ) : (
                                                institutions.map(inst => (
                                                    <SelectItem key={inst._id} value={inst.name}>{inst.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Number</Label>
                                <Input
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="+1 (555) 000-0000"
                                    className="h-12 rounded-xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 sm:p-8 border-t border-border flex gap-3 shrink-0 bg-background">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                            Dismiss
                        </Button>
                        <Button type="submit" className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-600/20">
                            {user ? 'Update Operator' : 'Confirm Onboarding'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

