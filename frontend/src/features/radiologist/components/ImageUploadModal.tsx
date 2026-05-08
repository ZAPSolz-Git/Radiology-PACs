import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (imageUrl: string) => void;
}

export function ImageUploadModal({ isOpen, onClose, onInsert }: ImageUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [urlInput, setUrlInput] = useState('');
    const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInsert = () => {
        if (uploadMode === 'file' && previewUrl) {
            onInsert(previewUrl);
            handleClose();
        } else if (uploadMode === 'url' && urlInput) {
            onInsert(urlInput);
            handleClose();
        } else {
            toast.error('Please select an image or enter a URL');
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setUrlInput('');
        setUploadMode('file');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-900">Insert Image</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="p-5 border-b border-border shrink-0">
                    <div className="flex gap-2">
                        <Button
                            variant={uploadMode === 'file' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setUploadMode('file')}
                            className="flex-1"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                        </Button>
                        <Button
                            variant={uploadMode === 'url' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setUploadMode('url')}
                            className="flex-1"
                        >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            From URL
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1 min-h-[min(300px,60vh)]">
                    {uploadMode === 'file' ? (
                        <div className="space-y-4">
                            {!previewUrl && (
                                <label
                                    htmlFor="image-upload"
                                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer w-full group"
                                >
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="image-upload"
                                    />
                                    <Upload className="w-10 h-10 text-slate-400 mb-3 group-hover:text-indigo-500 transition-colors" />
                                    <p className="text-sm font-medium text-slate-700 mb-1">
                                        Click to browse for an image
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        PNG, JPG, GIF up to 10MB
                                    </p>
                                </label>
                            )}

                            {previewUrl && (
                                <div className="border border-border rounded-xl p-4 bg-slate-50">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Preview</p>
                                        <button 
                                            onClick={() => { setPreviewUrl(''); setSelectedFile(null); }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className="flex justify-center bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="max-w-full h-auto rounded object-contain max-h-[40vh]"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3 truncate font-mono text-center">{selectedFile?.name}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Image URL
                                </label>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {urlInput && urlInput.startsWith('http') && (
                                <div className="border border-border rounded-xl p-4 bg-slate-50">
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Preview</p>
                                    <div className="flex justify-center bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
                                        <img
                                            src={urlInput}
                                            alt="Preview"
                                            className="max-w-full h-auto rounded object-contain max-h-[40vh]"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                            onLoad={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'block';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border flex justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-2xl">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInsert}
                        disabled={uploadMode === 'file' ? !previewUrl : !urlInput}
                        className="bg-indigo-600 hover:bg-indigo-500"
                    >
                        Insert Image
                    </Button>
                </div>
            </div>
        </div>
    );
}
