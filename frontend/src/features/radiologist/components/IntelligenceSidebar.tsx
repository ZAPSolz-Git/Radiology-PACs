import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Zap, Settings, ChevronRight, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RadiologistService } from '../services/RadiologistService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface IntelligenceSidebarProps {
    templates: any[];
    macros: any[];
    setTemplates: React.Dispatch<React.SetStateAction<any[]>>;
    setMacros: React.Dispatch<React.SetStateAction<any[]>>;
    onApplyTemplate: (template: any) => void;
    onApplyMacro?: (macro: any) => void;
}

export function IntelligenceSidebar({ templates, macros, setTemplates, setMacros, onApplyTemplate, onApplyMacro }: IntelligenceSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [manageMode, setManageMode] = useState(false);

    // Dialog state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit state
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingMacroId, setEditingMacroId] = useState<string | null>(null);

    // Form states
    const [newTemplate, setNewTemplate] = useState({ title: '', content: '', modality: 'CT', bodyPart: '' });
    const [newMacro, setNewMacro] = useState({ key: '', expansion: '' });

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.modality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bodyPart.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- TEMPLATE ACTIONS ---
    const handleOpenTemplateModal = (t?: any) => {
        if (t) {
            setEditingTemplateId(t._id);
            setNewTemplate({ title: t.title, content: t.content, modality: t.modality, bodyPart: t.bodyPart || '' });
        } else {
            setEditingTemplateId(null);
            setNewTemplate({ title: '', content: '', modality: 'CT', bodyPart: '' });
        }
        setIsTemplateModalOpen(true);
    };

    const handleSaveTemplate = async () => {
        if (!newTemplate.title || !newTemplate.content) return;
        setIsSaving(true);
        try {
            if (editingTemplateId) {
                const updated = await RadiologistService.updateTemplate(editingTemplateId, newTemplate);
                setTemplates(prev => prev.map(t => t._id === editingTemplateId ? updated : t));
                toast.success("Template updated");
            } else {
                const created = await RadiologistService.createTemplate(newTemplate);
                setTemplates(prev => [...prev, created]);
                toast.success("Template created");
            }
            setIsTemplateModalOpen(false);
        } catch (err) {
            toast.error("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTemplate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await RadiologistService.deleteTemplate(id);
            setTemplates(prev => prev.filter(t => t._id !== id));
            toast.success("Template deleted");
        } catch (err) {
            toast.error("Failed to delete template");
        }
    };

    // --- MACRO ACTIONS ---
    const handleOpenMacroModal = (m?: any) => {
        if (m) {
            setEditingMacroId(m._id);
            setNewMacro({ key: m.key, expansion: m.expansion });
        } else {
            setEditingMacroId(null);
            setNewMacro({ key: '', expansion: '' });
        }
        setIsMacroModalOpen(true);
    };

    const handleSaveMacro = async () => {
        if (!newMacro.key || !newMacro.expansion) return;
        setIsSaving(true);
        try {
            let key = newMacro.key;
            if (!key.startsWith('.')) key = '.' + key;

            if (editingMacroId) {
                const updated = await RadiologistService.updateMacro(editingMacroId, { ...newMacro, key });
                setMacros(prev => prev.map(m => m._id === editingMacroId ? updated : m));
                toast.success("Macro updated");
            } else {
                const created = await RadiologistService.createMacro({ ...newMacro, key });
                setMacros(prev => [...prev, created]);
                toast.success("Macro created");
            }
            setIsMacroModalOpen(false);
        } catch (err) {
            toast.error("Failed to save macro");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMacro = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await RadiologistService.deleteMacro(id);
            setMacros(prev => prev.filter(m => m._id !== id));
            toast.success("Macro deleted");
        } catch (err) {
            toast.error("Failed to delete macro");
        }
    };

    return (
        <div className="w-80 border-r border-border bg-card flex flex-col h-full relative">
            <div className="p-6 border-b border-border bg-muted/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Intelligence</span>
                    </div>
                    <Button 
                        variant={manageMode ? 'default' : 'ghost'} 
                        size="sm" 
                        className={`h-7 px-2.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-colors ${manageMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'text-slate-400 hover:text-indigo-600'}`}
                        onClick={() => setManageMode(!manageMode)}
                    >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Manage
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search assets..."
                        className="pl-10 h-10 bg-background border-border rounded-xl text-xs shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Templates Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Templates</h4>
                        {manageMode && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100" onClick={() => handleOpenTemplateModal()}>
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {filteredTemplates.map(t => (
                            <div
                                key={t._id}
                                onClick={() => !manageMode && onApplyTemplate(t)}
                                className={`p-3 rounded-xl border bg-background group transition-all flex flex-col relative ${
                                    manageMode 
                                        ? 'border-border' 
                                        : 'border-border hover:border-indigo-500 hover:shadow-sm cursor-pointer'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1 pr-6">
                                    <div className="text-[11px] font-black uppercase tracking-tight text-foreground line-clamp-1">{t.title}</div>
                                    {!manageMode && <ChevronRight className="absolute right-3 top-3 w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity text-indigo-600" />}
                                </div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase">{t.modality} • {t.bodyPart}</div>

                                {manageMode && (
                                    <div className="absolute right-2 top-2 flex gap-1 bg-background/90 backdrop-blur-sm p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-600 rounded" onClick={() => handleOpenTemplateModal(t)}>
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded" onClick={(e) => handleDeleteTemplate(e, t._id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredTemplates.length === 0 && (
                            <div className="text-center py-4 text-[10px] text-muted-foreground font-bold uppercase italic">No templates found</div>
                        )}
                    </div>
                </div>

                {/* Macros Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Macros / Shortcuts</h4>
                        {manageMode && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100" onClick={() => handleOpenMacroModal()}>
                                <Plus className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {macros.map(m => (
                            <div
                                key={m._id}
                                className={`flex items-center justify-between border border-border p-2 rounded-lg group transition-colors relative h-10 ${
                                    manageMode 
                                        ? 'bg-muted/10' 
                                        : 'bg-muted/20 hover:border-indigo-500/30 cursor-pointer active:scale-[0.98]'
                                }`}
                                onClick={() => !manageMode && onApplyMacro?.(m)}
                            >
                                <code className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-2">{m.key}</code>
                                <span className={cn("text-[9px] font-medium text-muted-foreground truncate flex-1", manageMode && "pr-14")}>
                                    {m.expansion}
                                </span>

                                {manageMode && (
                                    <div className="absolute right-1 top-1 bottom-1 flex gap-1 items-center bg-gradient-to-l from-muted/50 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 bg-white shadow-sm rounded-md" onClick={() => handleOpenMacroModal(m)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 bg-white shadow-sm rounded-md" onClick={(e) => handleDeleteMacro(e, m._id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Template Modal */}
            <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                <DialogContent className="sm:max-w-[500px] border-border rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-indigo-900 flex items-center gap-2">
                            {editingTemplateId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingTemplateId ? 'Edit Template' : 'Add New Template'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title</label>
                            <Input
                                placeholder="e.g. Normal CT Brain"
                                value={newTemplate.title}
                                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                                className="h-10 rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Modality</label>
                                <select
                                    className="w-full h-10 rounded-xl bg-background border border-input text-xs font-bold px-3 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                                    value={newTemplate.modality}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, modality: e.target.value })}
                                >
                                    <option>CT</option>
                                    <option>MRI</option>
                                    <option>X-Ray</option>
                                    <option>US</option>
                                    <option>PET-CT</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Body Part</label>
                                <Input
                                    placeholder="e.g. Chest"
                                    value={newTemplate.bodyPart}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, bodyPart: e.target.value })}
                                    className="h-10 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Template Content</label>
                            <Textarea
                                placeholder="Enter default findings and impression..."
                                className="min-h-[200px] rounded-xl text-xs font-medium leading-relaxed resize-none"
                                value={newTemplate.content}
                                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20"
                            onClick={handleSaveTemplate}
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingTemplateId ? 'Save Changes' : 'Deploy Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Macro Modal */}
            <Dialog open={isMacroModalOpen} onOpenChange={setIsMacroModalOpen}>
                <DialogContent className="sm:max-w-[400px] border-border rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-indigo-900 flex items-center gap-2">
                            {editingMacroId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingMacroId ? 'Edit Macro' : 'Add New Macro'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trigger Key</label>
                            <Input
                                placeholder=".shortcut"
                                value={newMacro.key}
                                onChange={(e) => setNewMacro({ ...newMacro, key: e.target.value })}
                                className="h-10 rounded-xl text-xs font-black text-indigo-600 placeholder:font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Expansion Text</label>
                            <Textarea
                                placeholder="Full normal description..."
                                value={newMacro.expansion}
                                onChange={(e) => setNewMacro({ ...newMacro, expansion: e.target.value })}
                                className="min-h-[120px] rounded-xl text-xs font-bold resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/20"
                            onClick={handleSaveMacro}
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingMacroId ? 'Save Changes' : 'Deploy Macro'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
