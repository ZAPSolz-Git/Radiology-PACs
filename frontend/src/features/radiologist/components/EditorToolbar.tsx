import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Table as TableIcon,
    Image as ImageIcon,
    Undo,
    Redo,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUploadModal } from './ImageUploadModal';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
    editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    if (!editor) {
        return null;
    }

    const addImage = (imageUrl: string) => {
        editor.chain().focus().setImage({ src: imageUrl }).run();
    };

    const addTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    return (
        <>
            <div className="border-b border-border bg-slate-100 p-2 flex flex-wrap gap-1 items-center">
                {/* Undo/Redo */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </Button>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                {/* Headings */}
                <Button
                    variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Heading 3"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                {/* Text Formatting */}
                <Button
                    variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                {/* Alignment */}
                <Button
                    variant={(editor.isActive({ textAlign: 'left' }) || editor.isActive('image', { align: 'left' })) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                        if (editor.isActive('image')) {
                            editor.chain().focus().updateAttributes('image', { align: 'left' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('left').run();
                        }
                    }}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant={(editor.isActive({ textAlign: 'center' }) || editor.isActive('image', { align: 'center' })) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                        if (editor.isActive('image')) {
                            editor.chain().focus().updateAttributes('image', { align: 'center' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('center').run();
                        }
                    }}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    variant={(editor.isActive({ textAlign: 'right' }) || editor.isActive('image', { align: 'right' })) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                        if (editor.isActive('image')) {
                            editor.chain().focus().updateAttributes('image', { align: 'right' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('right').run();
                        }
                    }}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Justify"
                >
                    <AlignJustify className="h-4 w-4" />
                </Button>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                <div className="flex items-center gap-1 px-1">
                    <Palette className="h-4 w-4 text-slate-500" />
                    <input
                        type="color"
                        onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                        title="Text Color"
                    />
                </div>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                {/* Lists */}
                <Button
                    variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px h-8 bg-slate-300 mx-1" />

                {/* Table */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={addTable}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    title="Insert Table"
                >
                    <TableIcon className="h-4 w-4" />
                </Button>

                {/* Image */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImageModalOpen(true)}
                    className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    title="Insert Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>

                {/* Image Resizing Controls */}
                {editor.isActive('image') && (
                    <>
                        <div className="w-px h-8 bg-slate-300 mx-1" />
                        <div className="flex items-center gap-1 bg-indigo-50/50 border border-indigo-100 rounded-md px-1 h-8 animate-in slide-in-from-left-2 duration-200">
                            <span className="text-[10px] font-bold text-indigo-400 px-1 uppercase tracking-wider">Size</span>
                            {[25, 50, 75, 100].map(size => (
                                <button
                                    key={size}
                                    onClick={() => editor.chain().focus().updateAttributes('image', { width: `${size}%` }).run()}
                                    className={cn(
                                        "h-6 px-1.5 text-[10px] font-medium rounded transition-colors",
                                        editor.getAttributes('image').width === `${size}%`
                                            ? "bg-indigo-600 text-white"
                                            : "text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                                    )}
                                >
                                    {size}%
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <ImageUploadModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                onInsert={addImage}
            />
        </>
    );
}

// Helper for class names if needed, but cn is imported from '@/lib/utils' in this project usually.
// Let's check imports.

