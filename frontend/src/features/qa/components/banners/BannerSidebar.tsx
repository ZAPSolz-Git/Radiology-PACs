import { useState, useEffect } from 'react';
import {
    Search, Image as ImageIcon, CheckCircle2, Loader2, AlertCircle,
    Settings, Plus, Pencil, Trash2, X, Upload, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn, getImageUrl } from '@/lib/utils';
import { Banner } from '../../types';
import { BannerService } from '../../services/BannerService';
import { Badge } from '@/components/ui/badge';

interface BannerSidebarProps {
    selectedBannerId?: string;
    onSelectBanner: (banner: Banner) => void;
}

export function BannerSidebar({ selectedBannerId, onSelectBanner }: BannerSidebarProps) {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [manageMode, setManageMode] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const data = await BannerService.getBanners();
            setBanners(data);
            setError(null);
        } catch (err) {
            console.error("Failed to load banners", err);
            setError("Failed to load banners");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    // Form Handlers
    const handleOpenModal = (banner?: Banner) => {
        if (banner) {
            setEditingBanner(banner);
            setTitle(banner.title);
            setDescription(banner.description || '');
            setIsActive(banner.isActive);
            setPreviewUrl(banner.imageUrl);
        } else {
            setEditingBanner(null);
            setTitle('');
            setDescription('');
            setIsActive(true);
            setPreviewUrl(null);
        }
        setSelectedFile(null);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }
        if (!editingBanner && !selectedFile) {
            toast.error("Banner image is required");
            return;
        }

        try {
            setIsSaving(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('isActive', String(isActive));
            if (selectedFile) {
                formData.append('bannerImage', selectedFile);
            }

            if (editingBanner) {
                await BannerService.updateBanner(editingBanner._id, formData);
                toast.success("Banner updated successfully");
            } else {
                await BannerService.createBanner(formData);
                toast.success("Banner created successfully");
            }

            setIsModalOpen(false);
            fetchBanners();
        } catch (err) {
            toast.error("Failed to save banner");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this banner? This cannot be undone.")) return;

        try {
            await BannerService.deleteBanner(id);
            toast.success("Banner deleted");
            fetchBanners();
        } catch (err) {
            toast.error("Failed to delete banner");
        }
    };

    const filteredBanners = banners.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-80 border-r border-border bg-card flex flex-col h-full animate-in slide-in-from-left duration-300">
            {/* Header Area defined by mode */}
            <div className="p-6 border-b border-border bg-muted/5 relative">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute right-4 top-4 h-8 w-8 rounded-xl transition-all",
                        manageMode ? "bg-indigo-100 text-indigo-700" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    )}
                    onClick={() => setManageMode(!manageMode)}
                    title={manageMode ? "Exit Manage Mode" : "Manage Assets"}
                >
                    <Settings className={cn("w-4 h-4", manageMode && "animate-spin-slow")} />
                </Button>

                <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {manageMode ? 'Manage Assets' : 'Select Banner'}
                    </span>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search banners..."
                        className="pl-10 h-10 bg-background border-border rounded-xl text-xs font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {manageMode && (
                    <Button
                        className="w-full mt-4 h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Create New Banner
                    </Button>
                )}
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Assets...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-red-500 bg-red-50/50 rounded-2xl border border-red-100 p-4 mx-2">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                    </div>
                ) : filteredBanners.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-muted-foreground font-black uppercase italic tracking-widest">
                        No Banners Found
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredBanners.map(banner => (
                            <div
                                key={banner._id}
                                onClick={() => !manageMode ? onSelectBanner(banner) : undefined}
                                className={cn(
                                    "relative rounded-2xl border transition-all group overflow-hidden bg-background",
                                    !manageMode && "cursor-pointer hover:border-indigo-400",
                                    !manageMode && selectedBannerId === banner._id && "border-indigo-600 shadow-lg shadow-indigo-600/10 ring-1 ring-indigo-600/20",
                                    !banner.isActive && "opacity-70 grayscale",
                                    manageMode && "border-border/80 shadow-sm"
                                )}
                            >
                                <div className="aspect-[3/1] bg-muted relative overflow-hidden">
                                    <img
                                        src={getImageUrl(banner.imageUrl)}
                                        alt={banner.title}
                                        className={cn(
                                            "w-full h-full object-cover transition-transform duration-500",
                                            !manageMode && "group-hover:scale-105"
                                        )}
                                    />

                                    {!manageMode && selectedBannerId === banner._id && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Manage Mode Overlay */}
                                    {manageMode && (
                                        <>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-white/90 text-indigo-600 hover:bg-white hover:text-indigo-700 shadow-xl"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(banner); }}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-700 shadow-xl"
                                                    onClick={(e) => handleDelete(e, banner._id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </>
                                    )}

                                    {!banner.isActive && (
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-[8px] font-black tracking-widest uppercase border-amber-200 text-amber-600 px-1.5 py-0">
                                                Inactive
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                </div>
                                <div className="p-3 bg-card border-t border-border/50">
                                    <div className="text-[11px] font-black uppercase tracking-tight text-foreground truncate">{banner.title}</div>
                                    {banner.description && (
                                        <div className="text-[9px] font-bold text-muted-foreground uppercase truncate mt-0.5">{banner.description}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20">
                <p className="text-[9px] font-extrabold text-muted-foreground text-center uppercase tracking-widest opacity-60">
                    Banners are applied to the final PDF/DOCX generated for the hospital.
                </p>
            </div>

            {/* Banner Editor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-card w-full max-w-xl max-h-[90vh] rounded-[2.5rem] border border-border shadow-2xl overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-foreground uppercase">{editingBanner ? 'Edit Digital Asset' : 'Upload New Branding'}</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Configure hospital letterhead parameters</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => setIsModalOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Asset Title</Label>
                                <Input
                                    placeholder="e.g. City Hospital Main Letterhead"
                                    className="h-12 px-4 rounded-2xl bg-muted/20 border-border font-bold focus-visible:ring-indigo-500"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Branding Image Source</Label>
                                <div
                                    className={cn(
                                        "relative h-40 rounded-[2rem] border-2 border-dashed border-border group hover:border-indigo-400 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-muted/5",
                                        previewUrl && "border-solid border-indigo-500/30"
                                    )}
                                    onClick={() => document.getElementById('banner-upload')?.click()}
                                >
                                    {previewUrl ? (
                                        <img src={getImageUrl(previewUrl)} className="w-full h-full object-contain p-4" alt="Preview" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground mb-2 group-hover:text-indigo-500 transition-colors" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select high-res image (3:1 recommended)</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Usage Description (Optional)</Label>
                                <Textarea
                                    placeholder="Explain where this banner should be used..."
                                    className="min-h-[100px] p-4 rounded-2xl bg-muted/20 border-border font-bold focus-visible:ring-indigo-500 resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border">
                                <div className="space-y-0.5">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-foreground">Asset Visibility</Label>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Enable this banner in the reporting workflow</p>
                                </div>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                    className="data-[state=checked]:bg-indigo-600"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-2 h-12 px-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            {editingBanner ? 'Update Asset' : 'Publish Asset'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

