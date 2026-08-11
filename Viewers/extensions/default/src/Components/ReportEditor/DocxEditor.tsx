import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
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
import { cn } from '@ohif/ui-next';
import { getSafeImageBuffer } from '../../utils/reportUtils';

interface ResizableImageComponentProps {
    node: any;
    updateAttributes: (attrs: any) => void;
    selected: boolean;
    editor: any;
    deleteNode: () => void;
}

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

    if (newJson.attrs) {
        Object.keys(newJson.attrs).forEach(key => {
            const val = newJson.attrs[key];
            if (typeof val === 'string' && val.includes('rgb(')) {
                newJson.attrs[key] = rgbToHex(val);
            }
        });
    }

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

    if (newJson.content && Array.isArray(newJson.content)) {
        newJson.content = newJson.content.map((node: any) => sanitizeTiptapJson(node));
    }
    return newJson;
}

const ResizableImageComponent = ({ node, updateAttributes, selected, editor, deleteNode }: ResizableImageComponentProps) => {
    const { src, width, height, align } = node.attrs;
    const containerRef = useRef<HTMLDivElement>(null);
    const onResize = useCallback((event: MouseEvent) => {
        if (!containerRef.current) return;
        const { clientX } = event;
        const { left } = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(50, clientX - left);
        const parentWidth = containerRef.current.parentElement?.clientWidth || 800;
        updateAttributes({ width: `${Math.min(100, Math.round((newWidth / parentWidth) * 100))}%` });
    }, [updateAttributes]);
    const onMouseDown = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        const onMouseMove = (e: MouseEvent) => onResize(e);
        const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [onResize]);
    const getAlignmentStyles = () => {
        if (align === 'center') return { display: 'flex', justifyContent: 'center', width: '100%', float: 'none' as any, clear: 'both' as any };
        if (align === 'right') return { display: 'inline-block', float: 'right' as any, marginLeft: '2rem', marginBottom: '1.5rem' };
        if (align === 'left-wrap') return { display: 'inline-block', float: 'left' as any, marginRight: '2rem', marginBottom: '1.5rem' };
        return { display: 'block', float: 'none' as any, clear: 'both' as any, width: '100%' };
    };
    return (
        <NodeViewWrapper className={cn("group transition-all duration-300 my-4 mx-0 relative", selected ? "z-20" : "z-10")} style={getAlignmentStyles()}>
            <div ref={containerRef} className={cn("relative leading-[0] transition-all duration-300 inline-block", selected ? "ring-[3px] ring-primary/80 ring-offset-2 rounded-xl shadow-2xl" : "hover:ring-2 hover:ring-primary/40 hover:rounded-xl")} style={{ width: width || '40%', maxWidth: '100%', height: height || 'auto' }}>
                <img src={src} alt="" className="w-full h-full block rounded-lg pointer-events-none object-contain" style={{ maxHeight: '80vh' }} />
                
                {/* Floating Quick Actions Menu - Restored to Top Right Inside Image */}
                {selected && (
                    <div className="absolute top-2 right-2 flex bg-white/95 backdrop-blur-sm rounded-lg shadow-md border overflow-hidden transition-all duration-200 z-[60]">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'left-wrap' }); }} title="Align Left (Wrap)" className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'left-wrap' ? "bg-primary/10 text-primary" : "text-slate-600")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 6H3M15 12H3M17 18H3" /></svg>
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'center' }); }} title="Align Center" className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'center' ? "bg-primary/10 text-primary" : "text-slate-600")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 12H6M21 18H3M21 6H3" /></svg>
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'right' }); }} title="Align Right (Wrap)" className={cn("p-1.5 hover:bg-slate-100 transition-colors", align === 'right' ? "bg-primary/10 text-primary" : "text-slate-600")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M21 6H3M21 12H9M21 18H3" /></svg>
                        </button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: 'none' }); }} title="Clear Alignment" className={cn("p-1.5 hover:bg-slate-100 transition-colors", (align === 'none' || !align) ? "bg-primary/10 text-primary" : "text-slate-600")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 10H6M21 6H3M21 14H3M18 18H6" /></svg>
                        </button>
                        <div className="w-px bg-slate-200" />
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }} title="Delete Image" className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                        </button>
                    </div>
                )}
                
                {/* Resize Handle - Restored to Bottom Center */}
                {selected && (
                    <div onMouseDown={onMouseDown} className="absolute bottom-[-6px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary border-2 border-white rounded-full cursor-ew-resize shadow-md z-20 hover:scale-125 transition-transform" />
                )}
            </div>
        </NodeViewWrapper>
    );
};

const ResizableImage = Image.extend({
    draggable: true,
    addAttributes() {
        return {
            ...this.parent?.(),
            width: { default: '40%', renderHTML: a => ({ width: a.width }), parseHTML: e => e.getAttribute('width') },
            height: { default: 'auto', renderHTML: a => ({ height: a.height }), parseHTML: e => e.getAttribute('height') },
            align: { default: 'none', renderHTML: a => ({ 'data-align': a.align }), parseHTML: e => e.getAttribute('data-align') },
            style: { default: null, renderHTML: a => ({ style: a.style }), parseHTML: e => e.getAttribute('style') }
        };
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
                        if (nodeEnd <= selection.to) return; 

                        let textToSearch = node.text;
                        let searchOffset = 0;

                        if (pos < selection.to && nodeEnd > selection.to) {
                            searchOffset = selection.to - pos;
                            textToSearch = node.text.substring(searchOffset);
                        }

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

export const DocxEditor = forwardRef<any, any>(({ macros, docxUrl, jsonContent, onLoad }, ref) => {
    const [keyBuffer, setKeyBuffer] = useState('');
    const macrosRef = useRef(macros);
    useEffect(() => { macrosRef.current = macros; }, [macros]);
    const editor = useEditor({
        extensions: [StarterKit, SmartVariables, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, ResizableImage.configure({ allowBase64: true }), Underline, TextStyle, Color, TextAlign.configure({ types: ['heading', 'paragraph'] })],
        content: '<p>Initializing editor...</p>',
        editorProps: {
            attributes: { class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8' },
            handleKeyDown: (view, event) => {
                const char = event.key;
                if (event.ctrlKey && (event.code === 'Space' || event.key === ' ')) {
                    event.preventDefault();
                    const matchedMacro = macrosRef.current.find(m => keyBuffer.trim().endsWith(m.key));
                    if (matchedMacro) {
                        const { state, dispatch } = view;
                        const { from } = state.selection;
                        dispatch(state.tr.insertText(matchedMacro.expansion, from - matchedMacro.key.length, from));
                        setKeyBuffer('');
                    } else toast.info('No matching macro found', { duration: 1500 });
                    return true;
                }
                if (char.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) setKeyBuffer(p => (p + char).slice(-20));
                else if (char === ' ' || char === 'Enter') {
                    const lastWord = keyBuffer.trim().split(/\s+/).pop() || '';
                    const m = macrosRef.current.find(m => m.key === lastWord || lastWord.endsWith(m.key));
                    if (m) {
                        const { state, dispatch } = view;
                        const { from } = state.selection;
                        dispatch(state.tr.insertText(m.expansion, from - lastWord.length, from));
                        setKeyBuffer('');
                    } else setKeyBuffer('');
                } else if (char === 'Backspace') setKeyBuffer(p => p.slice(0, -1));
                return false;
            }
        },
    });
    useEffect(() => {
        if (!editor) return;
        const load = async () => {
            console.log('[DocxEditor] Load Triggered. content:', { hasJson: !!jsonContent, hasDocx: !!docxUrl });
            try {
                if (jsonContent && jsonContent !== '""' && jsonContent !== '{}') {
                    console.log('[DocxEditor] Attempting JSON load');
                    try {
                        editor.commands.setContent(JSON.parse(jsonContent));
                        console.log('[DocxEditor] JSON load successful');
                    } catch (e) {
                        console.error('[DocxEditor] JSON parse failed, falling back', e);
                        if (docxUrl) {
                            const res = await fetch(docxUrl);
                            const result = await mammoth.convertToHtml({ arrayBuffer: await res.arrayBuffer() }, { convertImage: mammoth.images.imgElement(i => i.read("base64").then(b => ({ src: `data:${i.contentType};base64,${b}` }))) });
                            editor.commands.setContent(result.value);
                        }
                    }
                } else if (docxUrl) {
                    console.log('[DocxEditor] Loading from DOCX directly:', docxUrl);
                    const res = await fetch(docxUrl);
                    const result = await mammoth.convertToHtml({ arrayBuffer: await res.arrayBuffer() }, { convertImage: mammoth.images.imgElement(i => i.read("base64").then(b => ({ src: `data:${i.contentType};base64,${b}` }))) });
                    editor.commands.setContent(result.value);
                } else {
                    editor.commands.setContent('<p></p>');
                }
                if (onLoad) onLoad(editor);
            } catch (err) {
                console.error('[DocxEditor] Critical Load Error:', err);
            }
        };
        load();
    }, [editor, docxUrl, jsonContent, onLoad]);
    useImperativeHandle(ref, () => ({
        insertText: async (t: string) => editor?.chain().focus().insertContent(t).run(),
        insertImage: async (i: any) => {
            if (!editor) return;
            const src = i instanceof Blob ? await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(i); }) : i;
            editor.chain().focus().setImage({ src }).run();
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
                const rawJson = editor.getJSON();
                const sanitizedJson = sanitizeTiptapJson(rawJson);
                return await generateDOCX(sanitizedJson, {
                    outputType: 'blob',
                    image: {
                        handler: async s => await getSafeImageBuffer(s)
                    }
                });
             } catch (err) {
                 console.error('[DocxEditor] Export Failure:', err);
                 return null;
             }
        },
        exportToJson: () => editor ? JSON.stringify(editor.getJSON()) : '',
        getInstance: () => editor
    }));
    return editor ? (
        <div className="flex-1 overflow-hidden bg-white border border-border shadow-inner custom-docx-editor flex flex-col">
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-auto">
                <style dangerouslySetInnerHTML={{ __html: `.custom-docx-editor .tiptap { min-height: 100%; padding: 2rem; outline: none; color: #1e293b; font-size: 14px; line-height: 1.6; } .custom-docx-editor .tiptap p.is-editor-empty:first-child::before { content: 'Start typing...'; float: left; color: #94a3b8; pointer-events: none; height: 0; } .custom-docx-editor .tiptap h1, .custom-docx-editor .tiptap h2, .custom-docx-editor .tiptap h3 { font-weight: bold; color: #0f172a; margin: 1rem 0; } .custom-docx-editor .tiptap table { border-collapse: collapse; margin: 1rem 0; width: 100%; } .custom-docx-editor .tiptap table td, .custom-docx-editor .tiptap table th { border: 1px solid #cbd5e1; padding: 0.5rem; min-width: 1rem; } .custom-docx-editor .tiptap img { max-width: 100%; height: auto; display: block; margin: 1rem 0; } .custom-docx-editor .tiptap [data-align="left-wrap"] { float: left; margin-right: 1.5rem; margin-bottom: 0.75rem; display: block; } .custom-docx-editor .tiptap [data-align="right"] { float: right; margin-left: 1.5rem; margin-bottom: 0.75rem; display: block; } .custom-docx-editor .tiptap [data-align="center"] { margin-left: auto; margin-right: auto; display: block; float: none; clear: both; }` }} />
                <EditorContent editor={editor} />
            </div>
        </div>
    ) : null;
});
DocxEditor.displayName = 'DocxEditor';
