import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Key, Edit2, Trash2, Building2, UserCheck, ShieldOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminUser } from '../../types';
import { useState } from 'react';

interface UserListProps {
    users: AdminUser[];
    onEdit: (user: AdminUser) => void;
    onToggleStatus: (user: AdminUser) => void;
    onResetPassword: (user: AdminUser) => void;
    onDelete: (user: AdminUser) => void;
    showHospital?: boolean;
}

export function UserList({ users, onEdit, onToggleStatus, onResetPassword, onDelete, showHospital = false }: UserListProps) {
    const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

    const getRoleBadge = (role: string) => {
        const colors: Record<string, string> = {
            admin: "bg-red-500/10 text-red-500 border-red-500/20",
            radiologist: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
            technician: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            qa: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            institution: "bg-blue-500/10 text-blue-500 border-blue-500/20",
            user: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        };
        return (
            <Badge variant="outline" className={colors[role] || "bg-muted text-muted-foreground"}>
                {role.replace('_', ' ')}
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: "bg-emerald-500 text-white border-none",
            deactivated: "bg-muted text-muted-foreground border-none",
            locked: "bg-red-500 text-white border-none",
        };
        return (
            <Badge className={styles[status]}>
                {status}
            </Badge>
        );
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Operator</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Role</TableHead>
                        {showHospital && <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Hospital/Center</TableHead>}
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Status</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4">Registered</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground py-4 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={showHospital ? 6 : 5} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                                    <div className="p-4 bg-muted rounded-full">
                                        <MoreHorizontal className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <p className="font-bold text-muted-foreground italic uppercase text-xs tracking-widest">No users detected in sector</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user._id} className="hover:bg-muted/50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                            {getInitials(user.name)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground leading-tight">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                {showHospital && (
                                    <TableCell>
                                        {user.institution ? (
                                            <div className="flex items-center gap-1.5 group">
                                                <Building2 className="w-3 h-3 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                                <span className="text-xs font-bold text-foreground leading-none">{user.institution}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">N/A</span>
                                        )}
                                    </TableCell>
                                )}
                                <TableCell>{getStatusBadge(user.status)}</TableCell>
                                <TableCell className="text-xs font-medium text-muted-foreground">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <TooltipProvider delayDuration={0}>
                                            {/* Modify Profile */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-600 transition-all duration-200"
                                                        onClick={() => onEdit(user)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-indigo-600 text-[10px] font-black uppercase text-white border-none rounded-lg py-1 px-3">Modify Profile</TooltipContent>
                                            </Tooltip>

                                            {/* Link Institution (Technicians only) */}
                                            {user.role === 'technician' && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 transition-all duration-200"
                                                            onClick={() => onEdit(user)}
                                                        >
                                                            <Building2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="bg-blue-600 text-[10px] font-black uppercase text-white border-none rounded-lg py-1 px-3">Manage Association</TooltipContent>
                                                </Tooltip>
                                            )}

                                            {/* Reset Credentials */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-all duration-200"
                                                        onClick={() => onResetPassword(user)}
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-amber-600 text-[10px] font-black uppercase text-white border-none rounded-lg py-1 px-3">Reset Security</TooltipContent>
                                            </Tooltip>

                                            {/* Status Toggle */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-500/10 hover:text-orange-600 transition-all duration-200"
                                                        onClick={() => {
                                                            if (user.status === 'active') {
                                                                setUserToToggle(user);
                                                            } else {
                                                                onToggleStatus(user);
                                                            }
                                                        }}
                                                    >
                                                        {user.status === 'active' ? <ShieldOff className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-orange-600 text-[10px] font-black uppercase text-white border-none rounded-lg py-1 px-3">
                                                    {user.status === 'active' ? 'Suspend' : 'Activate'}
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Delete User */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-all duration-200"
                                                        onClick={() => setUserToDelete(user)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-red-600 text-[10px] font-black uppercase text-white border-none rounded-lg py-1 px-3">Purge Data</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Deactivation Confirmation */}
            <AlertDialog open={!!userToToggle} onOpenChange={(open) => !open && setUserToToggle(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Suspend Access?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will prevent {userToToggle?.name} from logging into the clinical workstation. This action is reversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Retain Access</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (userToToggle) onToggleStatus(userToToggle);
                                setUserToToggle(null);
                            }}
                            className="bg-amber-600 hover:bg-amber-500 rounded-xl"
                        >
                            Confirm Suspension
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 uppercase tracking-tighter font-black">Permanent Purge</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you absolutely sure? Purging {userToDelete?.name} will permanently remove their records from the system. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Abort Purge</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (userToDelete) onDelete(userToDelete);
                                setUserToDelete(null);
                            }}
                            className="bg-red-600 hover:bg-red-500 rounded-xl"
                        >
                            Confirm Purge
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

