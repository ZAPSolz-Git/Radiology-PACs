import React, { useState } from 'react';
import { Icons, cn } from '@ohif/ui-next';

interface IntelligenceSidebarProps {
    templates: any[];
    macros: any[];
    onApplyTemplate: (template: any) => void;
    onApplyMacro?: (macro: any) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function IntelligenceSidebar({ templates, macros, onApplyTemplate, onApplyMacro, isCollapsed = false, onToggleCollapse }: IntelligenceSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.modality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.bodyPart && t.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="w-full bg-[#090c29] flex flex-col h-full text-white">
            <div className={cn("p-4 border-b border-[#3a3f99]", isCollapsed && "px-2 pb-2")}>
                <div className="flex items-center justify-between mb-3">
                    {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-primary-light truncate">Intelligence Panel</span>}
                    <button 
                        onClick={onToggleCollapse} 
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors mx-auto flex items-center justify-center"
                        title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
                    >
                        {isCollapsed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        )}
                    </button>
                </div>
                {!isCollapsed && (
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="w-full bg-[#1e225cb3] border border-[#3a3f99] rounded-lg h-9 px-3 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-primary-light"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Templates</h4>
                        <div className="space-y-2">
                            {filteredTemplates.map(t => (
                                <div
                                    key={t._id}
                                    onClick={() => onApplyTemplate(t)}
                                    className="p-3 rounded-xl border border-[#3a3f99] bg-[#1e225cb3] hover:border-primary-light hover:bg-[#3a3f99]/40 transition-all cursor-pointer group"
                                >
                                    <div className="text-[11px] font-black uppercase tracking-tight text-white mb-1 group-hover:text-primary-light">{t.title}</div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase">{t.modality} • {t.bodyPart || 'General'}</div>
                                </div>
                            ))}
                            {filteredTemplates.length === 0 && (
                                <div className="text-center py-4 text-[10px] text-gray-500 font-bold uppercase italic">No templates found</div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Macros (Shortcuts)</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {macros.map(m => (
                                <div
                                    key={m._id}
                                    className="flex items-center justify-between bg-[#1e225cb3] border border-[#3a3f99] p-2 rounded-lg group hover:border-primary-light/50 transition-colors cursor-pointer"
                                    onClick={() => onApplyMacro?.(m)}
                                >
                                    <code className="text-[10px] font-black text-primary-light bg-primary-light/10 px-1.5 py-0.5 rounded">{m.key}</code>
                                    <span className="text-[9px] font-medium text-gray-300 truncate max-w-[120px]">{m.expansion}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
