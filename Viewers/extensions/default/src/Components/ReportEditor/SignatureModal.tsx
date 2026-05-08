import React, { useState, useRef } from 'react';
import { cn } from '@ohif/ui-next';
import { toast } from 'sonner';

interface SignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveBase64: (base64: string) => Promise<void>;
}

export function SignatureModal({ isOpen, onClose, onSaveBase64 }: SignatureModalProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resizeToBase64 = (file: File, maxWidth = 400): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = Math.min(1, maxWidth / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/png', 0.85));
                    } else reject(new Error("Canvas failure"));
                };
            };
            reader.onerror = () => reject(new Error("Read failure"));
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please upload a valid image (PNG/JPG)');
            return;
        }
        try {
            const base64 = await resizeToBase64(file, 400);
            setSelectedImage(base64);
        } catch (e) { toast.error('Processing failed'); }
    };

    const handleSave = async () => {
        if (!selectedImage) return;
        setIsSaving(true);
        try {
            await onSaveBase64(selectedImage);
            toast.success("Signature saved and applied!");
            onClose();
        } catch (e) { toast.error("Failed to save"); }
        finally { setIsSaving(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#090c29] border border-[#3a3f99] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#3a3f99] flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Digital Signature</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Upload for report inclusion</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center">
                    {selectedImage ? (
                        <div className="relative w-full aspect-[2/1] bg-white rounded-xl p-4 flex items-center justify-center group">
                            <img src={selectedImage} alt="Preview" className="max-w-full max-h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                <button onClick={() => setSelectedImage(null)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest">Remove</button>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-40 border-2 border-dashed border-[#3a3f99] rounded-2xl flex flex-col items-center justify-center bg-[#1e225cb3] hover:bg-[#3a3f99]/30 transition-all cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-primary-light/10 text-primary-light rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-primary-light">Upload Signature</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">PNG or JPG supported</span>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                    )}
                </div>

                <div className="p-6 bg-black/20 border-t border-[#3a3f99] flex gap-3 justify-end">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!selectedImage || isSaving}
                        className="px-6 py-2 bg-primary-light text-black rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light/90 transition-all shadow-xl shadow-primary/20"
                    >
                        {isSaving ? "Saving..." : "Apply Signature"}
                    </button>
                </div>
            </div>
        </div>
    );
}
