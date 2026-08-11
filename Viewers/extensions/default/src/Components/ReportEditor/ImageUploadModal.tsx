import React, { useState } from 'react';
import { Icons } from '@ohif/ui-next';
import { cn } from '@ohif/ui-next';
import { toast } from 'sonner';

const Button = ({ children, onClick, disabled, className, variant, size }: any) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    const variantClasses = variant === 'outline' ? 'border border-input bg-background hover:bg-accent hover:text-accent-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90';
    return <button onClick={onClick} disabled={disabled} className={cn(baseClasses, variantClasses, className)}>{children}</button>;
};

export function ImageUploadModal({ isOpen, onClose, onInsert }: any) {
    const [previewUrl, setPreviewUrl] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [mode, setMode] = useState<'file' | 'url'>('file');
    if (!isOpen) return null;
    const handleInsert = () => { if (mode === 'file' && previewUrl) { onInsert(previewUrl); onClose(); } else if (mode === 'url' && urlInput) { onInsert(urlInput); onClose(); } else toast.error('Select an image'); };
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-slate-900">Insert Image</h2>
                    <button onClick={onClose}><Icons.ByName name="close" className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                    <div className="flex gap-2 mb-4">
                        <Button variant={mode === 'file' ? 'default' : 'outline'} onClick={() => setMode('file')} className="flex-1">Upload</Button>
                        <Button variant={mode === 'url' ? 'default' : 'outline'} onClick={() => setMode('url')} className="flex-1">URL</Button>
                    </div>
                    {mode === 'file' ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center relative">
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = x => setPreviewUrl(x.target?.result as string); r.readAsDataURL(f); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <Icons.ByName name="Upload" className="w-12 h-12 mx-auto mb-2" /><p className="text-xs">Click to upload</p>
                        </div>
                    ) : (
                        <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 border rounded-lg" />
                    )}
                </div>
                <div className="p-6 border-t flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleInsert}>Insert</Button></div>
            </div>
        </div>
    );
}
