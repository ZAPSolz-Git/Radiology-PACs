import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HISTORY_TEMPLATES } from '../constants/HistoryTemplates';
import {
    ScrollText,
    Zap,
    Trash2,
    FileUp,
    Eye
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfirmationModal } from './ConfirmationModal';

interface HistoryManagerProps {
    history: string;
    setHistory: (history: string) => void;
    attachedFiles: File[];
    setAttachedFiles: (update: (prev: File[]) => File[]) => void;
    existingAttachments?: any[];
    onRemoveExistingAttachment?: (index: number) => void;
}

export function HistoryManager({
    history,
    setHistory,
    attachedFiles,
    setAttachedFiles,
    existingAttachments = [],
    onRemoveExistingAttachment
}: HistoryManagerProps) {
    // Default to 'edit' if we already have history, otherwise 'templates'
    const [selectedTab, setSelectedTab] = useState<'edit' | 'templates' | 'files'>(
        history ? 'edit' : (existingAttachments.length > 0 ? 'files' : 'templates')
    );
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; index: number | null }>({
        isOpen: false,
        index: null
    });

    // Helper to format file size
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const applyTemplate = (content: string) => {
        setHistory(content);
        setSelectedTab('edit');
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setAttachedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleView = (file: any) => {
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const fullUrl = file.url.startsWith('http') ? file.url : `${baseUrl}${file.url}`;
        window.open(fullUrl, '_blank');
    };

    return (
        <div className="flex flex-col h-full bg-background rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="flex bg-muted/30 border-b border-border p-1">
                {(['templates', 'edit', 'files'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold transition-all rounded-md capitalize",
                            selectedTab === tab ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab === 'templates' && <Zap className="w-3.5 h-3.5" />}
                        {tab === 'edit' && <ScrollText className="w-3.5 h-3.5" />}
                        {tab === 'files' && <FileUp className="w-3.5 h-3.5" />}
                        {tab}
                        {tab === 'files' && (attachedFiles.length + existingAttachments.length) > 0 && (
                            <span className="bg-primary text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ml-1">
                                {attachedFiles.length + existingAttachments.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
                {selectedTab === 'templates' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {HISTORY_TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => applyTemplate(t.content)}
                                    className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold group-hover:text-primary">{t.title}</span>
                                        <Badge variant="outline" className="text-[9px] h-4 uppercase tracking-tighter opacity-70">
                                            {t.modality}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">"{t.content}"</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTab === 'edit' && (
                    <div className="h-full flex flex-col gap-4">
                        <Textarea
                            value={history}
                            onChange={(e) => setHistory(e.target.value)}
                            placeholder="Enter patient clinical history here..."
                            className="flex-1 min-h-[250px] bg-muted/10 border-border focus:ring-primary/20 leading-relaxed text-sm resize-none"
                        />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium px-1">
                            <span>Double-check details before saving.</span>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-500/80" onClick={() => setHistory('')}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Clear
                            </Button>
                        </div>
                    </div>
                )}

                {selectedTab === 'files' && (
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                id="history-file-upload"
                            />
                            <label
                                htmlFor="history-file-upload"
                                className="h-32 flex flex-col items-center justify-center p-4 text-center bg-muted/5 rounded-xl border-2 border-dashed border-border group cursor-pointer hover:border-primary/50 transition-all"
                            >
                                <FileUp className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-primary group-hover:scale-110 transition-transform" />
                                <h3 className="text-xs font-bold mb-1 uppercase tracking-wider">Upload Case Attachments</h3>
                                <p className="text-[10px] text-muted-foreground leading-tight px-4">
                                    Click to select PDFs, JPGs, or other documents (Max 10MB)
                                </p>
                            </label>
                        </div>

                        {(existingAttachments.length > 0 || attachedFiles.length > 0) && (
                            <div className="space-y-4">
                                {existingAttachments.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Current Attachments</h4>
                                        <div className="space-y-1">
                                            {existingAttachments.map((file, i) => (
                                                <div key={`existing-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border text-xs group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                                                            <FileUp className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold truncate max-w-[200px]" title={file.name}>{file.name}</div>
                                                            <div className="text-[9px] text-muted-foreground uppercase">Previously Uploaded</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-indigo-500 hover:bg-indigo-50/30"
                                                            onClick={() => handleView(file)}
                                                            title="View File"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {onRemoveExistingAttachment && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-500 hover:bg-red-50/30"
                                                                onClick={() => {
                                                                    setDeleteConfirm({ isOpen: true, index: i });
                                                                }}
                                                                title="Delete Attachment"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <ConfirmationModal
                                    isOpen={deleteConfirm.isOpen}
                                    onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}
                                    title="Remove Attachment?"
                                    description="Are you sure you want to remove this file? You will need to click 'Save Changes' to permanently update the case."
                                    confirmLabel="Remove"
                                    variant="destructive"
                                    onConfirm={() => {
                                        if (deleteConfirm.index !== null && onRemoveExistingAttachment) {
                                            onRemoveExistingAttachment(deleteConfirm.index);
                                            toast.success("Attachment removed locally");
                                        }
                                    }}
                                />

                                {attachedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">New Uploads</h4>
                                        <div className="space-y-1">
                                            {attachedFiles.map((file, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border text-xs group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600">
                                                            <FileUp className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold truncate max-w-[200px]" title={file.name}>{file.name}</div>
                                                            <div className="text-[9px] text-muted-foreground uppercase">{formatSize(file.size)}</div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeFile(i)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
