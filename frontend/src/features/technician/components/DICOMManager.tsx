import { useState, useRef } from 'react';
import {
    Trash2,
    RefreshCcw,
    Plus,
    AlertCircle,
    Image as ImageIcon,
    MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn, getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { CaseService } from '../services/CaseService';

interface DICOMFile {
    sopInstanceUID?: string;
    sopClassUID?: string;
    name: string;
    path: string;
    instanceNumber?: number;
    seriesInstanceUID?: string;
}

interface DICOMManagerProps {
    caseId: string;
    dicomFiles: DICOMFile[];
    onUpdate: () => void;
    readOnly?: boolean;
}

export function DICOMManager({ caseId, dicomFiles, onUpdate, readOnly = false }: DICOMManagerProps) {
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [insertIndex, setInsertIndex] = useState<number | null>(null);
    const [replaceSopUid, setReplaceSopUid] = useState<string | null>(null);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 24;

    const sortedFiles = [...dicomFiles].sort((a, b) => (a.instanceNumber || 0) - (b.instanceNumber || 0));

    // Filter Logic
    const filteredFiles = sortedFiles.filter(file => {
        const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (file.instanceNumber?.toString().includes(searchTerm));
        return matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
    const currentFiles = filteredFiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const getThumbnailUrl = (fileName: string) => {
        // AI Service is on port 8000
        return `http://localhost:8000/thumbnail/${caseId}/${fileName}`;
    };

    const getRawUrl = (relPath: string) => {
        return getImageUrl(relPath);
    };

    const handleDelete = async (sopUid: string) => {
        if (!window.confirm("Are you sure you want to delete this frame? This action is permanent.")) return;

        try {
            setIsProcessing(sopUid);
            await CaseService.deleteDicomFrame(caseId, sopUid);
            toast.success("Frame deleted successfully");
            onUpdate();
        } catch (error) {
            toast.error("Failed to delete frame");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessing('upload');
            if (replaceSopUid) {
                await CaseService.replaceDicomFrame(caseId, replaceSopUid, file);
                toast.success("Frame replaced successfully");
            } else if (insertIndex !== null) {
                await CaseService.insertDicomFrame(caseId, insertIndex, file);
                toast.success(`Frame inserted at position ${insertIndex + 1}`);
            }
            onUpdate();
        } catch (error) {
            toast.error("Failed to process file");
        } finally {
            setIsProcessing(null);
            setReplaceSopUid(null);
            setInsertIndex(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerInsert = (index: number) => {
        setInsertIndex(index);
        setReplaceSopUid(null);
        fileInputRef.current?.click();
    };

    const triggerReplace = (sopUid: string) => {
        setReplaceSopUid(sopUid);
        setInsertIndex(null);
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".dcm"
            />

            <div className="flex flex-col gap-3 sm:gap-4 px-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                        <h5 className="text-[10px] font-black uppercase text-muted-foreground italic truncate">DICOM Sequence Manager</h5>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase truncate">Management of individual study frames • Atomic Re-indexing</p>
                    </div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase shrink-0">
                        {filteredFiles.length} Frames
                    </Badge>
                </div>

                {/* Search and Filters */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="Search filename or #..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-1.5 text-xs font-bold bg-muted/20 border border-border rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <div className="absolute left-2 top-1.5 sm:top-2 text-muted-foreground">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                {/* Initial Insert Point (Only on Page 1) */}
                {!readOnly && currentPage === 1 && !searchTerm && (
                    <div className="relative col-span-full h-2 group">
                        <button
                            onClick={() => triggerInsert(0)}
                            className="absolute inset-x-0 -top-2 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <div className="bg-primary text-white rounded-full p-1 shadow-lg scale-75 hover:scale-100 transition-transform">
                                <Plus className="w-4 h-4" />
                            </div>
                        </button>
                        <div className="absolute inset-x-0 top-1 h-[1px] bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {currentFiles.map((file, idx) => {
                    // Calculate actual global index for gap insertion
                    const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;

                    return (
                        <div key={file.sopInstanceUID || idx} className="relative group">
                            <div className={cn(
                                "aspect-square rounded-2xl border bg-card flex flex-col overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1",
                                (file.sopInstanceUID && isProcessing === file.sopInstanceUID) ? "opacity-50 animate-pulse border-primary" : "border-border shadow-sm"
                            )}>
                                {/* Frame Preview Header */}
                                <div className="h-5 sm:h-6 bg-muted/30 px-1.5 sm:px-2 flex items-center justify-between border-b border-border/50">
                                    <span className="text-[7px] sm:text-[8px] font-black text-muted-foreground uppercase">#{file.instanceNumber || idx + 1}</span>
                                    {!readOnly && file.sopInstanceUID && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="hover:text-primary transition-colors">
                                                    <MoreVertical className="w-3 h-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-border bg-background shadow-2xl">
                                                <DropdownMenuItem
                                                    onClick={() => file.sopInstanceUID && triggerReplace(file.sopInstanceUID)}
                                                    className="text-[10px] font-bold gap-2 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer"
                                                >
                                                    <RefreshCcw className="w-3 h-3" />
                                                    Replace Frame
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => file.sopInstanceUID && handleDelete(file.sopInstanceUID)}
                                                    className="text-[10px] font-bold gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Delete Frame
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                {/* Image Preview */}
                                <div className="flex-1 flex items-center justify-center bg-black/90 relative group-hover:bg-black transition-colors overflow-hidden">
                                    <img
                                        src={getThumbnailUrl(file.name)}
                                        alt={`Frame ${file.instanceNumber}`}
                                        className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                        loading="lazy"
                                        onError={(e) => {
                                            // Fallback to icon if load fails
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="hidden absolute inset-0 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                    </div>

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-[8px] font-black uppercase px-2 rounded-lg bg-background shadow-sm hover:scale-105 transition-transform"
                                            onClick={() => window.open(getRawUrl(file.path), '_blank')}
                                        >
                                            Peek Raw
                                        </Button>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-1.5 sm:p-2 border-t border-border/30">
                                    <div className="text-[7px] font-black text-muted-foreground uppercase truncate" title={file.name}>
                                        {file.name}
                                    </div>
                                </div>
                            </div>

                            {/* Gap Insert Point */}
                            {!readOnly && (
                                <div className="absolute -right-3 top-0 bottom-0 w-3 group/gap flex items-center justify-center z-10">
                                    <button
                                        onClick={() => triggerInsert(idx + 1)}
                                        className="opacity-0 group-hover/gap:opacity-100 transition-opacity"
                                    >
                                        <div className="bg-primary text-white rounded-full p-1 shadow-lg scale-50 hover:scale-90 transition-transform">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </button>
                                    <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-primary/20 opacity-0 group-hover/gap:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Optional: Add button at the very end if list is short AND on last page */}
                {!readOnly && !searchTerm && currentPage === totalPages && (
                    <button
                        onClick={() => triggerInsert(sortedFiles.length)}
                        className="aspect-square rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-all hover:border-primary group"
                    >
                        <div className="bg-muted p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary">Append</span>
                    </button>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-7 text-[10px] font-bold"
                    >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                    </Button>
                    <span className="text-[10px] font-black text-muted-foreground">
                        {currentPage}/{totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 text-[10px] font-bold"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                    </Button>
                </div>
            )}

            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/20 border border-border/50 flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-foreground italic">Clinical Note</p>
                    <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                        Adding or deleting frames triggers an automatic <span className="text-indigo-600 font-bold">AI Consistency Audit</span>.
                        Correcting gaps improves the study's clinical grade.
                    </p>
                </div>
            </div>
        </div>
    );
}
