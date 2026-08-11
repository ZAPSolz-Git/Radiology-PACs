import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Copy, AlertTriangle, Shield, Clock, MapPin, Trash2, Edit2, KeyRound } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiKey {
    _id: string;
    partnerName: string;
    keyPrefix: string;
    scopes: string[];
    expiresAt: string | null;
    lastUsedAt: string | null;
    rateLimit: number;
    ipWhitelist: string[];
    isActive: boolean;
    createdAt: string;
}

export function ApiKeyManager() {
    const { toast } = useToast();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newKeyData, setNewKeyData] = useState({
        partnerName: '',
        scopes: ['read:cases'],
        expiresAt: '',
        ipWhitelist: '',
        rateLimit: 100
    });

    // One-Time Raw Key Modal State
    const [rawKeyModalOpen, setRawKeyModalOpen] = useState(false);
    const [rawKey, setRawKey] = useState('');
    const [hasCopied, setHasCopied] = useState(false);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editKeyData, setEditKeyData] = useState<ApiKey | null>(null);

    // Revoke Confirm Modal
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/api-keys');
            setKeys(res.data.data || []);
        } catch (error: any) {
            toast({
                title: 'Error loading API keys',
                description: error.response?.data?.message || 'Unknown error occurred',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newKeyData,
                expiresAt: newKeyData.expiresAt ? new Date(newKeyData.expiresAt).toISOString() : null,
            };
            const res = await api.post('/admin/api-keys', payload);

            setRawKey(res.data.data.rawKey);
            setHasCopied(false);
            setCreateModalOpen(false);
            setRawKeyModalOpen(true);

            // Reset form
            setNewKeyData({
                partnerName: '',
                scopes: ['read:cases'],
                expiresAt: '',
                ipWhitelist: '',
                rateLimit: 100
            });

            fetchKeys();
        } catch (error: any) {
            toast({
                title: 'Failed to create key',
                description: error.response?.data?.message || 'An error occurred',
                variant: 'destructive'
            });
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(rawKey);
        setHasCopied(true);
        toast({
            title: 'Copied to clipboard',
            description: 'API key has been copied to your clipboard.',
        });
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/api-keys/${id}`, { isActive: !currentStatus });
            setKeys(keys.map(k => k._id === id ? { ...k, isActive: !currentStatus } : k));
            toast({ title: `Key ${!currentStatus ? 'activated' : 'deactivated'} successfully` });
        } catch (error: any) {
            toast({
                title: 'Failed to toggle status',
                description: error.response?.data?.message,
                variant: 'destructive'
            });
        }
    };

    const handleEditKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editKeyData) return;

        try {
            const payload = {
                scopes: editKeyData.scopes,
                ipWhitelist: typeof editKeyData.ipWhitelist === 'string' ? editKeyData.ipWhitelist : editKeyData.ipWhitelist.join(','),
                rateLimit: editKeyData.rateLimit
            };

            await api.patch(`/admin/api-keys/${editKeyData._id}`, payload);
            setEditModalOpen(false);
            fetchKeys();
            toast({ title: 'API Key updated successfully' });
        } catch (error: any) {
            toast({
                title: 'Failed to update key',
                description: error.response?.data?.message,
                variant: 'destructive'
            });
        }
    };

    const handleRevokeKey = async () => {
        if (!keyToRevoke) return;
        try {
            await api.delete(`/admin/api-keys/${keyToRevoke._id}`);
            setRevokeModalOpen(false);
            setKeyToRevoke(null);
            fetchKeys();
            toast({ title: 'API Key permanently revoked' });
        } catch (error: any) {
            toast({
                title: 'Failed to revoke key',
                description: error.response?.data?.message,
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <KeyRound className="w-8 h-8 text-indigo-500" />
                        API Keys
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage external partner access to the Radiology OS API.</p>
                </div>
                <Button onClick={() => setCreateModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4" />
                    Create New Key
                </Button>
            </div>

            {/* Keys Table */}
            <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50 backdrop-blur-xl">
                <ScrollArea className="w-full">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[200px]">Partner</TableHead>
                                <TableHead>Key Prefix</TableHead>
                                <TableHead>Scopes</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            Loading keys...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : keys?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                        <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>No API keys generated yet.</p>
                                        <Button variant="link" onClick={() => setCreateModalOpen(true)} className="mt-2">
                                            Create your first key
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                (keys || []).map((key) => (
                                    <TableRow key={key._id} className="group hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="font-semibold text-foreground">{key.partnerName}</div>
                                            {key.expiresAt && (
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    Expires {format(new Date(key.expiresAt), 'MMM d, yyyy')}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                                                {key.keyPrefix}••••••••
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {key.scopes.map(scope => (
                                                    <Badge key={scope} variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                                                        {scope}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {key.lastUsedAt ? (
                                                <div className="text-sm text-foreground">
                                                    {formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground/60 italic">Never used</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={key.isActive}
                                                    onCheckedChange={() => handleToggleActive(key._id, key.isActive)}
                                                />
                                                <span className={`text-xs font-medium ${key.isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                                                    {key.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        setEditKeyData({ ...key, ipWhitelist: key.ipWhitelist.join(', ') } as any);
                                                        setEditModalOpen(true);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={() => {
                                                        setKeyToRevoke(key);
                                                        setRevokeModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </Card>

            {/* Create Key Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                            Generate a new secure key for an external partner.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateKey} className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="partnerName">Partner / Application Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="partnerName"
                                placeholder="e.g. 5C Network"
                                required
                                value={newKeyData.partnerName}
                                onChange={(e) => setNewKeyData({ ...newKeyData, partnerName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Granted Scopes</Label>
                            <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="scope-read"
                                        checked={newKeyData.scopes.includes('read:cases')}
                                        onCheckedChange={(c) => {
                                            if (c) setNewKeyData({ ...newKeyData, scopes: [...newKeyData.scopes, 'read:cases'] });
                                            else setNewKeyData({ ...newKeyData, scopes: newKeyData.scopes.filter(s => s !== 'read:cases') });
                                        }}
                                    />
                                    <Label htmlFor="scope-read" className="font-normal cursor-pointer flex flex-col">
                                        <span className="font-medium">Read Cases</span>
                                        <span className="text-xs text-muted-foreground">Allows fetching patient metadata and case details</span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="scope-write"
                                        checked={newKeyData.scopes.includes('write:reports')}
                                        onCheckedChange={(c) => {
                                            if (c) setNewKeyData({ ...newKeyData, scopes: [...newKeyData.scopes, 'write:reports'] });
                                            else setNewKeyData({ ...newKeyData, scopes: newKeyData.scopes.filter(s => s !== 'write:reports') });
                                        }}
                                    />
                                    <Label htmlFor="scope-write" className="font-normal cursor-pointer flex flex-col">
                                        <span className="font-medium">Write Reports</span>
                                        <span className="text-xs text-muted-foreground">Allows uploading finalized reports (PDF/DOCX)</span>
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rateLimit">Rate Limit (req/min)</Label>
                                <Input
                                    id="rateLimit"
                                    type="number"
                                    min="1"
                                    value={newKeyData.rateLimit}
                                    onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value) || 100 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
                                <Input
                                    id="expiresAt"
                                    type="date"
                                    value={newKeyData.expiresAt}
                                    onChange={(e) => setNewKeyData({ ...newKeyData, expiresAt: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ipWhitelist">IP Whitelist (Optional)</Label>
                            <Input
                                id="ipWhitelist"
                                placeholder="Comma separated, e.g. 192.168.1.1, 10.0.0.0/24"
                                value={newKeyData.ipWhitelist}
                                onChange={(e) => setNewKeyData({ ...newKeyData, ipWhitelist: e.target.value })}
                            />
                            <p className="text-[11px] text-muted-foreground">Leave blank to allow access from any IP.</p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!newKeyData.partnerName || newKeyData.scopes.length === 0}>
                                Generate Key
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* One-Time Raw Key Modal */}
            <Dialog open={rawKeyModalOpen} onOpenChange={(open) => {
                if (!open && !hasCopied) return; // Prevent closing if not copied
                setRawKeyModalOpen(open);
            }}>
                <DialogContent className="sm:max-w-[500px] border-amber-500/20">
                    <DialogHeader>
                        <div className="flex items-center gap-3 text-amber-500 mb-2">
                            <AlertTriangle className="w-8 h-8" />
                            <DialogTitle className="text-xl">Save Your API Key</DialogTitle>
                        </div>
                        <DialogDescription className="text-base text-foreground/80 font-medium">
                            This key will never be shown again. Copy it now and store it securely.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/10 rounded-xl blur-xl transition-all group-hover:bg-indigo-500/20"></div>
                            <div className="relative bg-muted/80 border border-border p-4 rounded-xl flex items-center gap-4">
                                <code className="flex-1 font-mono text-sm break-all text-indigo-400 font-semibold select-all">
                                    {rawKey}
                                </code>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="shrink-0 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors"
                                    onClick={handleCopyKey}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <Alert variant="destructive" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Shield className="h-4 w-4" />
                            <AlertTitle>Security Warning</AlertTitle>
                            <AlertDescription className="text-xs mt-1">
                                Treat this key like a password. Do not hardcode it in frontend applications or commit it to version control.
                            </AlertDescription>
                        </Alert>

                        <div className="flex items-center space-x-2 pt-4">
                            <Checkbox
                                id="copied-confirm"
                                checked={hasCopied}
                                onCheckedChange={(c) => setHasCopied(c as boolean)}
                            />
                            <Label htmlFor="copied-confirm" className="cursor-pointer font-medium">
                                I have copied and securely stored this API key
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => setRawKeyModalOpen(false)}
                            disabled={!hasCopied}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50"
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Edit API Key</DialogTitle>
                        <DialogDescription>
                            Update settings for {editKeyData?.partnerName}
                        </DialogDescription>
                    </DialogHeader>
                    {editKeyData && (
                        <form onSubmit={handleEditKey} className="space-y-6 mt-4">
                            <div className="space-y-3">
                                <Label>Granted Scopes</Label>
                                <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="edit-scope-read"
                                            checked={editKeyData.scopes.includes('read:cases')}
                                            onCheckedChange={(c) => {
                                                if (c) setEditKeyData({ ...editKeyData, scopes: [...editKeyData.scopes, 'read:cases'] });
                                                else setEditKeyData({ ...editKeyData, scopes: editKeyData.scopes.filter(s => s !== 'read:cases') });
                                            }}
                                        />
                                        <Label htmlFor="edit-scope-read" className="font-medium cursor-pointer">Read Cases</Label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Checkbox
                                            id="edit-scope-write"
                                            checked={editKeyData.scopes.includes('write:reports')}
                                            onCheckedChange={(c) => {
                                                if (c) setEditKeyData({ ...editKeyData, scopes: [...editKeyData.scopes, 'write:reports'] });
                                                else setEditKeyData({ ...editKeyData, scopes: editKeyData.scopes.filter(s => s !== 'write:reports') });
                                            }}
                                        />
                                        <Label htmlFor="edit-scope-write" className="font-medium cursor-pointer">Write Reports</Label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-rateLimit">Rate Limit (req/min)</Label>
                                <Input
                                    id="edit-rateLimit"
                                    type="number"
                                    min="1"
                                    value={editKeyData.rateLimit}
                                    onChange={(e) => setEditKeyData({ ...editKeyData, rateLimit: parseInt(e.target.value) || 100 })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-ipWhitelist">IP Whitelist</Label>
                                <Input
                                    id="edit-ipWhitelist"
                                    placeholder="Comma separated IPs"
                                    value={editKeyData.ipWhitelist}
                                    onChange={(e) => setEditKeyData({ ...editKeyData, ipWhitelist: e.target.value as any })}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={editKeyData.scopes.length === 0}>
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Revoke Confirm Modal */}
            <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="flex items-center gap-3 text-red-500 mb-2">
                            <Trash2 className="w-6 h-6" />
                            <DialogTitle>Revoke API Key</DialogTitle>
                        </div>
                        <DialogDescription className="text-base text-foreground mt-4">
                            Are you sure you want to permanently revoke the API key for <strong className="text-foreground">{keyToRevoke?.partnerName}</strong>?
                        </DialogDescription>
                        <p className="text-sm text-red-500 mt-2 font-medium">
                            This cannot be undone. The partner will lose access immediately.
                        </p>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRevokeKey}>Revoke Permanently</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
