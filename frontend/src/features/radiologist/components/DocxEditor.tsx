
import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import mammoth from 'mammoth';
import { generateDOCX } from '@docen/export-docx';
import { toast } from 'sonner';
import { EditorToolbar } from './EditorToolbar';
import { cn, getImageUrl } from '@/lib/utils';

/**
 * Converts rgb(r, g, b) to #RRGGBB
 */
function rgbToHex(rgb: string): string {
    if (!rgb || typeof rgb !== 'string') return rgb;
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;

    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);

    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Recursively walks Tiptap JSON and converts all rgb() colors to Hex
 * Required because @docen/export-docx is strict about hex colors.
 */
function sanitizeTiptapJson(json: any): any {
    if (!json || typeof json !== 'object') return json;

    const newJson = Array.isArray(json) ? [...json] : { ...json };

    // Sanitize attributes (color, backgroundColor, etc.)
    if (newJson.attrs) {
        Object.keys(newJson.attrs).forEach(key => {
            const val = newJson.attrs[key];
            if (typeof val === 'string' && val.includes('rgb(')) {
                newJson.attrs[key] = rgbToHex(val);
            }
        });
    }

    // Sanitize marks (text color, background-color)
    if (newJson.marks && Array.isArray(newJson.marks)) {
        newJson.marks.forEach((mark: any) => {
            if (mark.attrs) {
                Object.keys(mark.attrs).forEach(key => {
                    const val = mark.attrs[key];
                    if (typeof val === 'string' && val.includes('rgb(')) {
                        mark.attrs[key] = rgbToHex(val);
                    }
                });
            }
        });
    }

    // Recurse through content
    if (newJson.content && Array.isArray(newJson.content)) {
        newJson.content = newJson.content.map((node: any) => sanitizeTiptapJson(node));
    }

    return newJson;
}

// Interactive Image Component for Resizing
// Interactive Image Component for Resizing and Alignment
const ResizableImageComponent = ({ node, updateAttributes, selected, deleteNode }: any) => {
    const { src, width, height, align } = node.attrs;
    const containerRef = useRef<HTMLDivElement>(null);

    const onResize = useCallback((event: MouseEvent) => {
        if (!containerRef.current) return;

        const { clientX } = event;
        const { left } = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(50, clientX - left);

        const parentWidth = containerRef.current.parentElement?.clientWidth || 800;
        const widthPercent = (newWidth / parentWidth) * 100;

        updateAttributes({
            width: `${Math.min(100, Math.round(widthPercent))}%`,
        });
    }, [updateAttributes]);

    const onMouseDown = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const onMouseMove = (e: MouseEvent) => onResize(e);
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [onResize]);

    // Alignment styles using floats for text wrapping
    const getAlignmentStyles = () => {
        if (align === 'center') return { display: 'flex', justifyContent: 'center', width: '100%', float: 'none' as any, clear: 'both' as any };
        if (align === 'right') return { display: 'inline-block', float: 'right' as any, marginLeft: '2rem', marginBottom: '1.5rem' };
        if (align === 'left-wrap') return { display: 'inline-block', float: 'left' as any, marginRight: '2rem', marginBottom: '1.5rem' };
        // Default / none: block reset
        return { display: 'block', float: 'none' as any, clear: 'both' as any, width: '100%' };
    };

    return (
        <NodeViewWrapper
            className={cn(
                "group transition-all duration-300 my-4 mx-0 relative",
                selected ? "z-20" : "z-10"
            )}
            style={getAlignmentStyles()}
        >
            <div
                ref={containerRef}
                className={cn(
                    "relative leading-[0] transition-all duration-300 inline-block",
                    selected ? "ring-[3px] ring-indigo-500/80 ring-offset-2 rounded-xl shadow-2xl" : "hover:ring-2 hover:ring-indigo-300/40 hover:rounded-xl"
                )}
                style={{ width: width || 'auto', maxWidth: '100%', height: height || 'auto' }}
            >
                <img
                    src={src}
                    alt=""
                    className="w-full h-full block rounded-lg pointer-events-none object-contain"
                    style={{ maxHeight: '80vh' }}
                />

                {/* Floating Quick Actions Menu - Restored to Top Right Inside Image */}
                {selected && (
                    <div className="absolute top-2 right-2 flex bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-indigo-100 overflow-hidden transition-all duration-200 z-[60]">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'left-wrap' }); }}
                            title="Wrap Left"
                            className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'left-wrap' ? "bg-indigo-100 text-indigo-700" : "text-slate-600")}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 6H3M15 12H3M17 18H3" /></svg>
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'center' }); }}
                            title="Center"
                            className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'center' ? "bg-indigo-100 text-indigo-700" : "text-slate-600")}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 12H6M21 18H3M21 6H3" /></svg>
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'right' }); }}
                            title="Wrap Right"
                            className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'right' ? "bg-indigo-100 text-indigo-700" : "text-slate-600")}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 6H3M21 12H9M21 18H3" /></svg>
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'none' }); }}
                            title="Full Width"
                            className={cn("p-1.5 hover:bg-slate-100 transition-colors", (align === 'none' || !align) ? "bg-indigo-100 text-indigo-700" : "text-slate-600")}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 10H3M21 6H3M21 14H3M21 18H3" /></svg>
                        </button>
                        <div className="w-px bg-slate-200" />
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
                            title="Delete"
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                        </button>
                    </div>
                )}

                {/* Resize Handle - Restored to Bottom Center */}
                {selected && (
                    <div
                        onMouseDown={onMouseDown}
                        className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full cursor-ew-resize shadow-lg z-20 hover:scale-125 transition-transform"
                    />
                )}

                {/* Size Indicator */}
                {selected && (
                    <div className="absolute top-3 left-3 bg-indigo-600/90 text-white text-[10px] px-2 py-1 rounded-lg font-bold shadow-lg backdrop-blur-sm pointer-events-none animate-in fade-in slide-in-from-top-1">
                        {width}
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// Custom TableCell that preserves background-color from HTML
const CustomTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            backgroundColor: {
                default: null,
                parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
                renderHTML: (attributes: Record<string, any>) => {
                    if (!attributes.backgroundColor) return {};
                    return { style: `background-color: ${attributes.backgroundColor}` };
                },
            },
        };
    },
});

// Custom Image extension
const ResizableImage = Image.extend({
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '40%', // Better default for reported findings
                renderHTML: attributes => ({ width: attributes.width }),
                parseHTML: element => element.getAttribute('width'),
            },
            height: {
                default: 'auto',
                renderHTML: attributes => ({ height: attributes.height }),
                parseHTML: element => element.getAttribute('height'),
            },
            align: {
                default: 'none',
                renderHTML: attributes => ({ 'data-align': attributes.align }),
                parseHTML: element => element.getAttribute('data-align'),
            },
        }
    },
    addNodeView() { return ReactNodeViewRenderer(ResizableImageComponent); },
});

// Smart Variables Keyboard Extension (Tab navigation for [brackets])
const SmartVariables = Extension.create({
    name: 'smartVariables',
    addKeyboardShortcuts() {
        return {
            Tab: ({ editor }) => {
                const { state } = editor.view;
                const { doc, selection } = state;
                let matchStart = -1;
                let matchEnd = -1;

                doc.descendants((node, pos) => {
                    if (matchStart !== -1) return false;

                    if (node.isText && node.text) {
                        const nodeEnd = pos + node.nodeSize;
                        if (nodeEnd <= selection.to) return; // Skip text before or at cursor

                        let textToSearch = node.text;
                        let searchOffset = 0;

                        if (pos < selection.to && nodeEnd > selection.to) {
                            searchOffset = selection.to - pos;
                            textToSearch = node.text.substring(searchOffset);
                        }

                        // Regex to match [anything]
                        const match = textToSearch.match(/\[(.*?)\]/);
                        if (match && match.index !== undefined) {
                            matchStart = pos + searchOffset + match.index;
                            matchEnd = matchStart + match[0].length;
                        }
                    }
                });

                if (matchStart !== -1 && matchEnd !== -1) {
                    editor.commands.setTextSelection({ from: matchStart, to: matchEnd });
                    editor.view.dispatch(editor.view.state.tr.scrollIntoView());
                    return true;
                }

                return false;
            }
        }
    }
});


interface DocxEditorProps {
    macros: any[];
    docxUrl?: string;
    jsonContent?: string;
    initialHtml?: string;
    onLoad?: (instance: any) => void;
}

export interface DocxEditorHandle {
    insertText: (text: string) => Promise<void>;
    insertImage: (input: Blob | string) => Promise<void>;
    prependContent: (html: string) => void;
    appendContent: (html: string) => void;
    getHTML: () => string;
    exportToDocx: () => Promise<Blob | null>;
    exportToJson: () => string;
    getInstance: () => any;
}

export const DocxEditor = forwardRef<DocxEditorHandle, DocxEditorProps>(({ macros, docxUrl, jsonContent, initialHtml, onLoad }, ref) => {
    const keyBufferRef = useRef('');
    const macrosRef = useRef(macros);

    useEffect(() => {
        macrosRef.current = macros;
    }, [macros]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            SmartVariables,
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            CustomTableCell,
            ResizableImage.configure({ allowBase64: true }),
            Underline,
            TextStyle,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: '<p>Initializing editor...</p>',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none h-full',
            },
            handleKeyDown: (view, event) => {
                const char = event.key;

                // Manual Trigger: CTRL+SPACE
                if (event.ctrlKey && (event.code === 'Space' || event.key === ' ')) {
                    event.preventDefault();

                    const matchedMacro = macrosRef.current.find(m => keyBufferRef.current.trim().endsWith(m.key));
                    if (matchedMacro) {
                        const { state, dispatch } = view;
                        const { from } = state.selection;
                        const tr = state.tr.insertText(matchedMacro.expansion, from - matchedMacro.key.length, from);
                        dispatch(tr);
                        keyBufferRef.current = '';
                    } else {
                        toast.info('No matching macro found', { duration: 1500 });
                    }
                    return true;
                }

                // Buffer tracking for auto-expansion
                if (char.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    keyBufferRef.current = (keyBufferRef.current + char).slice(-20);
                } else if (char === ' ' || char === 'Enter') {
                    const lastWord = keyBufferRef.current.trim().split(/\s+/).pop() || '';
                    const matchedMacro = macrosRef.current.find(m => m.key === lastWord || lastWord.endsWith(m.key));

                    if (matchedMacro) {
                        const { state, dispatch } = view;
                        const { from } = state.selection;
                        const tr = state.tr.insertText(matchedMacro.expansion, from - lastWord.length, from);
                        dispatch(tr);
                        keyBufferRef.current = '';
                    } else {
                        keyBufferRef.current = '';
                    }
                } else if (char === 'Backspace') {
                    keyBufferRef.current = keyBufferRef.current.slice(0, -1);
                }

                return false;
            }
        },
    });

    // Handle document loading (Prioritize JSON for perfect persistence)
    useEffect(() => {
        if (!editor) return;

        if (!docxUrl && !jsonContent) {
            if (onLoad) onLoad(editor);
            return;
        }

        const loadContent = async () => {
            try {
                if (jsonContent && jsonContent !== '""' && jsonContent !== '{}') {
                    console.log('[DocxEditor] Loading content from JSON');
                    try {
                        editor.commands.setContent(JSON.parse(jsonContent));
                    } catch (e) {
                        console.error('[DocxEditor] JSON parse failed, falling back to DOCX', e);
                        if (docxUrl) {
                            const response = await fetch(docxUrl);
                            const arrayBuffer = await response.arrayBuffer();
                            const result = await mammoth.convertToHtml({ arrayBuffer }, {
                                convertImage: mammoth.images.imgElement((image) => {
                                    return image.read("base64").then((imageBuffer) => {
                                        return { src: "data:" + image.contentType + ";base64," + imageBuffer };
                                    });
                                })
                            });
                            editor.commands.setContent(result.value);
                        }
                    }
                } else if (docxUrl) {
                    console.log('[DocxEditor] Loading content from DOCX:', docxUrl);
                    const response = await fetch(docxUrl);
                    const arrayBuffer = await response.arrayBuffer();

                    const options = {
                        convertImage: mammoth.images.imgElement((image) => {
                            return image.read("base64").then((imageBuffer) => {
                                return {
                                    src: "data:" + image.contentType + ";base64," + imageBuffer
                                };
                            });
                        })
                    };

                    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
                    editor.commands.setContent(result.value);
                } else if (initialHtml) {
                    console.log('[DocxEditor] Loading content from initialHtml');
                    editor.commands.setContent(initialHtml);
                } else {
                    editor.commands.setContent('<p></p>');
                }

                if (onLoad) onLoad(editor);
            } catch (err) {
                console.error('[DocxEditor] Load Error:', err);
            }
        };

        loadContent();
    }, [editor, docxUrl, jsonContent, onLoad]);

    useImperativeHandle(ref, () => ({
        insertText: async (text: string) => {
            if (editor) {
                editor.chain().focus().insertContent(text).run();
            }
        },

        insertImage: async (input: Blob | string) => {
            if (!editor) return;
            try {
                let src: string;

                if (input instanceof Blob) {
                    src = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('FileReader failed'));
                        reader.readAsDataURL(input);
                    });
                } else {
                    src = input;
                }

                editor.chain().focus().setImage({ src }).run();
            } catch (err) {
                console.error('[DocxEditor] Insert Image Error:', err);
                toast.error('Failed to insert image');
            }
        },

        prependContent: (html: string) => {
            if (editor) {
                editor.chain().focus().insertContentAt(0, html).run();
            }
        },

        appendContent: (html: string) => {
            if (editor) {
                const pos = editor.state.doc.content.size;
                editor.chain().focus().insertContentAt(pos, html).run();
            }
        },

        getHTML: () => {
            return editor ? editor.getHTML() : '';
        },

        exportToDocx: async () => {
            if (!editor) return null;
            try {
                // IMPORTANT: Sanitize JSON to convert rgb() to Hex
                // @docen/export-docx crashes on rgb() values
                const rawJson = editor.getJSON();
                const sanitizedJson = sanitizeTiptapJson(rawJson);

                console.log('[DocxEditor] Exporting sanitized JSON to DOCX...');

                const buffer = await generateDOCX(sanitizedJson, {
                    outputType: 'blob',
                    image: {
                        handler: async (src: string): Promise<Uint8Array> => {
                            try {
                                if (src.startsWith('data:')) {
                                    const base64Data = src.split(',')[1];
                                    const binaryString = window.atob(base64Data);
                                    const bytes = new Uint8Array(binaryString.length);
                                    for (let i = 0; i < binaryString.length; i++) {
                                        bytes[i] = binaryString.charCodeAt(i);
                                    }
                                    return bytes;
                                }

                                // Resolve full URL for local API paths (e.g. /api/banners/...)
                                const fullUrl = getImageUrl(src);
                                console.log('[DocxEditor] Fetching image for DOCX:', fullUrl);

                                const response = await fetch(fullUrl);
                                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                                const buffer = await response.arrayBuffer();
                                return new Uint8Array(buffer);
                            } catch (error) {
                                console.error('[DocxEditor] Image embedding failed for:', src, error);
                                // Return empty pixel to prevent total export failure
                                return new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59]);
                            }
                        }
                    }
                });
                return buffer as Blob;
            } catch (err) {
                console.error('[DocxEditor] Export Error:', err);
                throw err;
            }
        },

        exportToJson: () => {
            return editor ? JSON.stringify(editor.getJSON()) : '';
        },

        getInstance: () => editor
    }));

    if (!editor) {
        return null;
    }

    return (
        <div className="flex-1 overflow-hidden bg-white border border-border shadow-inner custom-docx-editor flex flex-col">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-auto">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-docx-editor .tiptap {
                        min-height: 100%;
                        padding: 2rem;
                        outline: none;
                        color: #1e293b;
                        font-size: 14px;
                        line-height: 1.6;
                    }
                    .custom-docx-editor .tiptap p.is-editor-empty:first-child::before {
                        content: 'Start typing your report...';
                        float: left;
                        color: #94a3b8;
                        pointer-events: none;
                        height: 0;
                    }
                    .custom-docx-editor .tiptap h1 {
                        font-size: 2em;
                        font-weight: bold;
                        margin: 1rem 0;
                        color: #0f172a;
                    }
                    .custom-docx-editor .tiptap h2 {
                        font-size: 1.5em;
                        font-weight: bold;
                        margin: 0.75rem 0;
                        color: #0f172a;
                    }
                    .custom-docx-editor .tiptap h3 {
                        font-size: 1.25em;
                        font-weight: bold;
                        margin: 0.5rem 0;
                        color: #0f172a;
                    }
                    .custom-docx-editor .tiptap strong {
                        font-weight: bold;
                        color: #0f172a;
                    }
                    .custom-docx-editor .tiptap em {
                        font-style: italic;
                    }
                    .custom-docx-editor .tiptap u {
                        text-decoration: underline;
                    }
                    .custom-docx-editor .tiptap ul,
                    .custom-docx-editor .tiptap ol {
                        padding-left: 2rem;
                        margin: 0.5rem 0;
                    }
                    .custom-docx-editor .tiptap li {
                        margin: 0.25rem 0;
                    }
                    .custom-docx-editor .tiptap table {
                        border-collapse: collapse;
                        margin: 1rem 0;
                        width: 100%;
                    }
                    .custom-docx-editor .tiptap table td,
                    .custom-docx-editor .tiptap table th {
                        border: 1px solid #cbd5e1;
                        padding: 8px 14px;
                        min-width: 1rem;
                        color: #1e293b;
                        vertical-align: middle;
                    }
                    .custom-docx-editor .tiptap table th {
                        background-color: #f1f5f9;
                        font-weight: bold;
                    }
                    .custom-docx-editor .tiptap table td p,
                    .custom-docx-editor .tiptap table th p {
                        margin: 0 !important;
                        padding: 0;
                        line-height: 1.4;
                    }
                    .custom-docx-editor .tiptap img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                        margin: 1rem 0;
                    }
                    .custom-docx-editor .tiptap [data-align="left-wrap"] {
                        float: left;
                        margin-right: 1.5rem;
                        margin-bottom: 0.75rem;
                        display: block;
                    }
                    .custom-docx-editor .tiptap [data-align="right"] {
                        float: right;
                        margin-left: 1.5rem;
                        margin-bottom: 0.75rem;
                        display: block;
                    }
                    .custom-docx-editor .tiptap [data-align="center"] {
                        margin-left: auto;
                        margin-right: auto;
                        display: block;
                        float: none;
                    }
                `}} />
                <EditorContent editor={editor} className="flex-1 flex flex-col [&>div]:flex-1 [&>div]:min-h-full" />
            </div>
        </div>
    );
});

DocxEditor.displayName = 'DocxEditor';
