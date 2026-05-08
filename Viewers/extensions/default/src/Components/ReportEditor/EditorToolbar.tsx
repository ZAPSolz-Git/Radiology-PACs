import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Icons } from '@ohif/ui-next';
import { cn } from '@ohif/ui-next';
import { ImageUploadModal } from './ImageUploadModal';

const Button = ({ children, onClick, disabled, className, title, variant, size }: any) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    const variantClasses = variant === 'ghost' ? 'hover:bg-accent hover:text-accent-foreground text-slate-700' : 'bg-primary text-primary-foreground hover:bg-primary/90';
    const sizeClasses = size === 'sm' ? 'h-9 px-3 rounded-md' : 'h-10 py-2 px-4';
    return (
        <button onClick={onClick} disabled={disabled} className={cn(baseClasses, variantClasses, sizeClasses, className)} title={title}>
            {children}
        </button>
    );
};

export function EditorToolbar({ editor }: any) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    if (!editor) return null;
    return (
        <>
            <div className="border-b border-border bg-slate-100 p-2 flex flex-wrap gap-1 items-center">
                <Button variant="ghost" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
                    <Icons.ByName name="Undo" className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
                    <Icons.ByName name="Redo" className="h-4 w-4" />
                </Button>
                <div className="w-px h-8 bg-slate-300 mx-1" />
                <Button variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1">
                    <span className="font-bold text-xs">H1</span>
                </Button>
                <Button variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">
                    <span className="font-bold text-xs">H2</span>
                </Button>
                <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                    <span className="font-bold">B</span>
                </Button>
                <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                    <span className="italic font-serif">I</span>
                </Button>
                <div className="w-px h-8 bg-slate-300 mx-1" />
                <Button variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Left">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M17 12H3M19 18H3M21 6H3" /></svg>
                </Button>
                <Button variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M18 12H6M21 18H3M21 6H3" /></svg>
                </Button>
                <Button variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M21 12H7M21 18H3M21 6H3" /></svg>
                </Button>
                <div className="w-px h-8 bg-slate-300 mx-1" />
                <Button variant="ghost" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
                </Button>
                <Button variant="ghost" onClick={() => setIsImageModalOpen(true)} title="Image">
                    <Icons.ByName name="Upload" className="h-4 w-4" />
                </Button>
            </div>
            <ImageUploadModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} onInsert={(s: any) => editor.chain().focus().setImage({ src: s }).run()} />
        </>
    );
}
