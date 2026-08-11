import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Copy, Check, Trash2, Clock, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { CaseService } from '../services/CaseService';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseId: string;
    patientName: string;
}

export function ShareModal({ isOpen, onClose, caseId, patientName }: ShareModalProps) {
    const [role, setRole] = useState<string>('user');
    const [expiresIn, setExpiresIn] = useState<string>('24h');
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [existingLinks, setExistingLinks] = useState<any[]>([]);
    const [isLoadingLinks, setIsLoadingLinks] = useState(false);

    const fetchLinks = useCallback(async () => {
        if (!caseId) return;
        setIsLoadingLinks(true);
        try {
            const links = await CaseService.getCaseShareLinks(caseId);
            setExistingLinks(links);
        } catch (error) {
            console.error('Failed to fetch existing links:', error);
        } finally {
            setIsLoadingLinks(false);
        }
    }, [caseId]);

    useEffect(() => {
        if (isOpen) {
            fetchLinks();
        }
    }, [isOpen, fetchLinks]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const { shareUrl, token } = await CaseService.createShareLink(caseId, role, expiresIn);
            setShareUrl(shareUrl);
            setShareToken(token);
            fetchLinks(); // Refresh list
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to generate share link');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            toast.success('Share link copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy. Please manually select and copy the text.');
        }
    };

    const handleRevoke = async (token: string) => {
        setIsRevoking(true);
        try {
            await CaseService.revokeShareLink(token);
            toast.success('Link revoked successfully.');
            if (token === shareToken) {
                setShareUrl(null);
                setShareToken(null);
            }
            fetchLinks(); // Refresh list
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to revoke link');
        } finally {
            setIsRevoking(false);
        }
    };

    const handleClose = () => {
        setShareUrl(null);
        setShareToken(null);
        setRole('user');
        setExpiresIn('24h');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="shrink-0 text-left">
                    <DialogTitle className="flex items-center gap-2 text-indigo-600">
                        <Share2 className="w-5 h-5" />
                        Secure Study Sharing
                    </DialogTitle>
                    <DialogDescription>
                        Generate a secure, time-limited link for "{patientName}".
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden py-4 space-y-6">
                    {/* Generator Section */}
                    <div className="space-y-4">
                        {!shareUrl ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="role">Viewer Role</Label>
                                    <Select value={role} onValueChange={setRole}>
                                        <SelectTrigger id="role" className="w-full">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* <SelectItem value="radiologist">Radiologist</SelectItem>
                                            <SelectItem value="technician">Technician</SelectItem>
                                            <SelectItem value="qa">QA / Audit</SelectItem> */}
                                            <SelectItem value="user">External User</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Expiry</Label>
                                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                                        <SelectTrigger id="expiry" className="w-full">
                                            <SelectValue placeholder="Select expiration" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1h">1 Hour</SelectItem>
                                            <SelectItem value="6h">6 Hours</SelectItem>
                                            <SelectItem value="24h">24 Hours</SelectItem>
                                            <SelectItem value="7d">7 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 pt-2">
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Secure Link'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-4 bg-emerald-200 border border-emerald-200 rounded-xl">
                                    <Label className="text-emerald-700 font-bold flex items-center gap-2 mb-2 text-sm">
                                        <Check className="w-4 h-4" /> New Link Generated
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={shareUrl}
                                            className="bg-white border-emerald-200 focus-visible:ring-emerald-600 font-mono text-black text-xs h-9"
                                        />
                                        <Button
                                            onClick={() => handleCopy(shareUrl)}
                                            variant="default"
                                            className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3 shrink-0"
                                        >
                                            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Expires in {expiresIn}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Existing Links Section */}
                    {existingLinks.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <LinkIcon className="w-3 h-3" />
                                    Active Share Links ({existingLinks.length})
                                </Label>
                            </div>

                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-2">
                                    {existingLinks.map((link) => (
                                        <div
                                            key={link.token}
                                            className="p-3 bg-muted/40 rounded-lg border border-border group hover:border-indigo-400/30 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[10px] font-bold uppercase h-5 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                                            {link.role}
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Created {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-mono truncate max-w-[200px] text-muted-foreground/70">
                                                        ...{link.token.slice(-12)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
                                                        onClick={() => handleCopy(link.shareUrl)}
                                                        title="Copy Link"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                                        onClick={() => handleRevoke(link.token)}
                                                        disabled={isRevoking}
                                                        title="Revoke Link"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-1 text-[9px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    Expires {formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0 pt-4 border-t border-border mt-auto">
                    <Button variant="ghost" className="text-xs" onClick={handleClose}>
                        {shareUrl ? 'Done' : 'Cancel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
