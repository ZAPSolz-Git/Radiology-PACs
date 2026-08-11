import { useState, useEffect } from 'react';
import { RadiologistService } from '../services/RadiologistService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Zap,
    Plus,
    Trash2,
    Save,
    FileText,
    Filter,
    Activity,
    Loader2,
    Pencil,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function IntelligenceManager() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [macros, setMacros] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [editingMacroId, setEditingMacroId] = useState<string | null>(null);

    // New Template State
    const [newTemplate, setNewTemplate] = useState({
        title: '',
        content: '',
        modality: 'CT',
        bodyPart: ''
    });

    // New Macro State
    const [newMacro, setNewMacro] = useState({
        key: '',
        expansion: ''
    });

    useEffect(() => {
        const fetchIntel = async () => {
            try {
                const [t, m] = await Promise.all([
                    RadiologistService.getTemplates(),
                    RadiologistService.getMacros()
                ]);
                setTemplates(t || []);
                setMacros(m || []);
            } catch (err) {
                toast.error("Failed to load intelligence data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchIntel();
    }, []);

    const handleCreateTemplate = async () => {
        if (!newTemplate.title || !newTemplate.content) return;
        setIsSaving(true);
        try {
            if (editingTemplateId) {
                const updated = await RadiologistService.updateTemplate(editingTemplateId, newTemplate);
                setTemplates(templates.map(t => t._id === editingTemplateId ? updated : t));
                toast.success("Template updated successfully");
            } else {
                const created = await RadiologistService.createTemplate(newTemplate);
                setTemplates([...templates, created]);
                toast.success("Template created successfully");
            }
            handleCancelEditTemplate();
        } catch (err) {
            toast.error(editingTemplateId ? "Failed to update template" : "Failed to create template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditTemplate = (t: any) => {
        setNewTemplate({
            title: t.title,
            content: t.content,
            modality: t.modality,
            bodyPart: t.bodyPart || ''
        });
        setEditingTemplateId(t._id);
    };

    const handleCancelEditTemplate = () => {
        setNewTemplate({ title: '', content: '', modality: 'CT', bodyPart: '' });
        setEditingTemplateId(null);
    };

    const handleCreateMacro = async () => {
        if (!newMacro.key || !newMacro.expansion) return;
        setIsSaving(true);
        try {
            let key = newMacro.key;
            if (!key.startsWith('.')) {
                key = '.' + key;
            }

            if (editingMacroId) {
                const updated = await RadiologistService.updateMacro(editingMacroId, { ...newMacro, key });
                setMacros(macros.map(m => m._id === editingMacroId ? updated : m));
                toast.success("Macro updated successfully");
            } else {
                const created = await RadiologistService.createMacro({ ...newMacro, key });
                setMacros([...macros, created]);
                toast.success("Macro created successfully");
            }
            handleCancelEditMacro();
        } catch (err) {
            toast.error(editingMacroId ? "Failed to update macro" : "Failed to create macro");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditMacro = (m: any) => {
        setNewMacro({
            key: m.key,
            expansion: m.expansion
        });
        setEditingMacroId(m._id);
    };

    const handleCancelEditMacro = () => {
        setNewMacro({ key: '', expansion: '' });
        setEditingMacroId(null);
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            await RadiologistService.deleteTemplate(id);
            setTemplates(templates.filter(t => t._id !== id));
            toast.success("Template deleted");
        } catch (err) {
            toast.error("Failed to delete template");
        }
    };

    const handleDeleteMacro = async (id: string) => {
        try {
            await RadiologistService.deleteMacro(id);
            setMacros(macros.filter(m => m._id !== id));
            toast.success("Macro deleted");
        } catch (err) {
            toast.error("Failed to delete macro");
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center bg-background/80">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Loading Intelligence Assets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Intelligence Management</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Personalize your reporting workflow</p>
                </div>
            </div>

            <Tabs defaultValue="templates" className="w-full">
                <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
                    <TabsTrigger value="templates" className="rounded-lg px-8 font-black uppercase tracking-widest text-[10px] h-full gap-2 transition-all">
                        <FileText className="w-3.5 h-3.5" />
                        Report Templates
                    </TabsTrigger>
                    <TabsTrigger value="macros" className="rounded-lg px-8 font-black uppercase tracking-widest text-[10px] h-full gap-2 transition-all">
                        <Zap className="w-3.5 h-3.5" />
                        Macros & Shortcuts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="mt-8 space-y-8">
                    {/* Create Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                {editingTemplateId ? <Pencil className="w-4 h-4 text-emerald-500" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                                {editingTemplateId ? 'Edit Template' : 'Add New Template'}
                            </h3>
                            <div className="space-y-4">
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
                                            className="w-full h-10 rounded-xl bg-background border border-border text-xs font-bold px-3 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
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
                                        className="min-h-[200px] rounded-2xl text-xs font-medium leading-relaxed"
                                        value={newTemplate.content}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className={`flex-1 h-12 ${editingTemplateId ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'} rounded-xl font-black uppercase tracking-[0.2em] text-[10px] gap-2 shadow-xl ${editingTemplateId ? 'shadow-emerald-600/20' : 'shadow-indigo-600/20'}`}
                                        onClick={handleCreateTemplate}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {editingTemplateId ? 'Update Template' : 'Deploy Template'}
                                    </Button>
                                    {editingTemplateId && (
                                        <Button
                                            variant="ghost"
                                            className="h-12 w-12 rounded-xl bg-muted/50 hover:bg-muted"
                                            onClick={handleCancelEditTemplate}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Templates List */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    Active Templates ({templates.length})
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                                        <Filter className="w-3.5 h-3.5" />
                                        Modality
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map((t) => (
                                    <div key={t._id} className="bg-card border border-border p-5 rounded-2xl hover:border-indigo-500/50 transition-all group shadow-sm flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="text-[11px] font-black uppercase tracking-tight text-foreground group-hover:text-indigo-600">{t.title}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{t.modality}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{t.bodyPart}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleEditTemplate(t)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    onClick={() => handleDeleteTemplate(t._id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 text-[10px] text-muted-foreground font-medium line-clamp-4 leading-relaxed bg-muted/20 p-3 rounded-xl">
                                            {t.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="macros" className="mt-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                {editingMacroId ? <Pencil className="w-4 h-4 text-emerald-500" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                                {editingMacroId ? 'Edit Macro' : 'Add New Macro'}
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trigger Key (e.g. .nad)</label>
                                    <Input
                                        placeholder=".shortcut"
                                        value={newMacro.key}
                                        onChange={(e) => setNewMacro({ ...newMacro, key: e.target.value })}
                                        className="h-10 rounded-xl text-xs font-black text-indigo-600 placeholder:font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Expansion Text</label>
                                    <Input
                                        placeholder="Full normal description..."
                                        value={newMacro.expansion}
                                        onChange={(e) => setNewMacro({ ...newMacro, expansion: e.target.value })}
                                        className="h-10 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className={`flex-1 h-12 ${editingMacroId ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'} rounded-xl font-black uppercase tracking-[0.2em] text-[10px] gap-2 shadow-xl ${editingMacroId ? 'shadow-emerald-600/20' : 'shadow-indigo-600/20'}`}
                                        onClick={handleCreateMacro}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                        {editingMacroId ? 'Update Macro' : 'Deploy Macro'}
                                    </Button>
                                    {editingMacroId && (
                                        <Button
                                            variant="ghost"
                                            className="h-12 w-12 rounded-xl bg-muted/50 hover:bg-muted"
                                            onClick={handleCancelEditMacro}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8">
                            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border">
                                            <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trigger</th>
                                            <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expansion</th>
                                            <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {macros.map((m) => (
                                            <tr key={m._id} className="hover:bg-muted/10 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <code className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                        {m.key}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] font-bold text-foreground">
                                                    {m.expansion}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-indigo-400 hover:text-indigo-500 hover:bg-indigo-50"
                                                            onClick={() => handleEditMacro(m)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50"
                                                            onClick={() => handleDeleteMacro(m._id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
