import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileSignature, Loader2, X } from 'lucide-react';

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
                    } else {
                        reject(new Error("Failed to get canvas context"));
                    }
                };
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (PNG/JPG)');
            return;
        }

        try {
            const base64 = await resizeToBase64(file, 400); // 400px max width
            setSelectedImage(base64);
        } catch (error) {
            toast.error('Failed to process image');
        }
    };

    const handleSave = async () => {
        if (!selectedImage) return;

        setIsSaving(true);
        try {
            await onSaveBase64(selectedImage);
            toast.success("Signature saved and applied to your profile!");
            onClose();
        } catch (err) {
            toast.error("Failed to save signature");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-900 border-b pb-4">
                        <FileSignature className="w-5 h-5 text-indigo-600" />
                        Upload Digital Signature
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Upload an image of your signature. This will be securely saved to your profile and can be injected into any report.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center">
                    {selectedImage ? (
                        <div className="relative w-full max-w-[300px] border border-border rounded-xl p-4 bg-muted/10 flex items-center justify-center">
                            <img src={selectedImage} alt="Signature Preview" className="max-w-full max-h-[150px] object-contain mix-blend-multiply" />
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-3 -right-3 h-8 w-8 rounded-full shadow-md"
                                onClick={() => setSelectedImage(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <div 
                            className="w-full h-40 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3 text-indigo-600">
                                <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-semibold text-indigo-900">Click to upload image</span>
                            <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/jpg" 
                                onChange={handleFileChange}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={!selectedImage || isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
                        {isSaving ? "Saving..." : "Save Signature"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
