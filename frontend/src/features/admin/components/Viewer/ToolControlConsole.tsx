import React, { useState, useEffect, useMemo } from 'react';
import { AdminService } from '../../../admin/services/AdminService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Loader2, Save, Layout, Ruler, Settings2, Shield,
    CheckCircle2, XCircle, Eye, EyeOff, Info,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ViewerToolIcon } from '@/components/ui/ViewerToolIcon';

const ROLES = ['radiologist', 'technician', 'qa', 'user', 'institution'] as const;

const ROLE_META: Record<string, {
    label: string;
    color: string;
    emoji: string;
}> = {
    radiologist: { label: 'Radiologist', color: 'from-blue-500 to-indigo-600', emoji: '🩺' },
    technician: { label: 'Technician', color: 'from-emerald-500 to-teal-600', emoji: '🔧' },
    qa: { label: 'QA', color: 'from-amber-500 to-orange-600', emoji: '🔍' },
    user: { label: 'User', color: 'from-purple-500 to-violet-600', emoji: '👤' },
    institution: { label: 'Institution', color: 'from-pink-500 to-rose-600', emoji: '🏥' },
};

const TOOL_CATEGORIES = {
    Navigation: {
        icon: <Layout className="w-3.5 h-3.5" />,
        textColor: 'text-blue-600 dark:text-blue-400',
        rowBg: 'bg-blue-500/[0.04]',
        badgeCls: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
        tools: ['WindowLevel', 'Pan', 'Zoom', 'TrackballRotate', 'Capture', 'Layout', 'Crosshairs', 'StackScroll'],
    },
    Measurements: {
        icon: <Ruler className="w-3.5 h-3.5" />,
        textColor: 'text-emerald-600 dark:text-emerald-400',
        rowBg: 'bg-emerald-500/[0.04]',
        badgeCls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        tools: ['Length', 'Bidirectional', 'ArrowAnnotate', 'EllipticalROI', 'RectangleROI', 'CircleROI', 'PlanarFreehandROI', 'SplineROI', 'LivewireContour', 'Angle', 'CobbAngle', 'CalibrationLine', 'UltrasoundDirectionalTool'],
    },
    'Image Controls': {
        icon: <Settings2 className="w-3.5 h-3.5" />,
        textColor: 'text-violet-600 dark:text-violet-400',
        rowBg: 'bg-violet-500/[0.04]',
        badgeCls: 'bg-violet-500/10 border-violet-500/20 text-violet-700 dark:text-violet-300',
        tools: ['Reset', 'rotate-right', 'flipHorizontal', 'invert', 'ImageSliceSync', 'ReferenceLines', 'ImageOverlayViewer', 'WindowLevelRegion', 'Cine'],
    },
    'Inspection & Analysis': {
        icon: <Eye className="w-3.5 h-3.5" />,
        textColor: 'text-amber-600 dark:text-amber-400',
        rowBg: 'bg-amber-500/[0.04]',
        badgeCls: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
        tools: ['Probe', 'Magnify', 'AdvancedMagnify', 'TagBrowser', 'Colorbar', 'SegmentLabelTool'],
    },
    'Viewport Menus': {
        icon: <Shield className="w-3.5 h-3.5" />,
        textColor: 'text-pink-600 dark:text-pink-400',
        rowBg: 'bg-pink-500/[0.04]',
        badgeCls: 'bg-pink-500/10 border-pink-500/20 text-pink-700 dark:text-pink-300',
        tools: ['orientationMenu', 'dataOverlayMenu', 'windowLevelMenu', 'windowLevelMenuEmbedded', 'voiManualControlMenu', 'thresholdMenu', 'opacityMenu', 'modalityLoadBadge', 'navigationComponent', 'trackingStatus'],
    },
} as const;

const ALL_TOOL_IDS = Object.values(TOOL_CATEGORIES).flatMap(c => [...c.tools]);

export function ToolControlConsole() {
    const [restrictions, setRestrictions] = useState<Record<string, string[]>>({});
    const [originalRestrictions, setOriginalRestrictions] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { fetchRestrictions(); }, []);

    const fetchRestrictions = async () => {
        try {
            const data = await AdminService.getViewerRestrictions();
            setRestrictions(data);
            setOriginalRestrictions(data);
        } catch (error) {
            toast.error('Failed to fetch viewer restrictions');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = useMemo(
        () => JSON.stringify(restrictions) !== JSON.stringify(originalRestrictions),
        [restrictions, originalRestrictions]
    );

    const handleToggleTool = (role: string, toolId: string) => {
        setRestrictions(prev => {
            const roleTools = prev[role] || [];
            const newTools = roleTools.includes(toolId)
                ? roleTools.filter(t => t !== toolId)
                : [...roleTools, toolId];
            return { ...prev, [role]: newTools };
        });
    };

    const handleToggleCategory = (role: string, category: keyof typeof TOOL_CATEGORIES, enableAll: boolean) => {
        setRestrictions(prev => {
            const roleTools = prev[role] || [];
            const categoryTools = TOOL_CATEGORIES[category].tools as unknown as string[];
            const newTools = enableAll
                ? [...new Set([...roleTools, ...categoryTools])]
                : roleTools.filter(t => !categoryTools.includes(t));
            return { ...prev, [role]: newTools };
        });
    };

    const handleEnableAllForRole = (role: string) => setRestrictions(prev => ({ ...prev, [role]: [...ALL_TOOL_IDS] }));
    const handleDisableAllForRole = (role: string) => setRestrictions(prev => ({ ...prev, [role]: [] }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(restrictions).map(([role, tools]) => {
                if ((ROLES as readonly string[]).includes(role)) {
                    return AdminService.updateViewerRestrictions(role, tools);
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            setOriginalRestrictions({ ...restrictions });
            toast.success('Viewer restrictions saved successfully');
        } catch (error) {
            toast.error('Failed to save restrictions');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
                    Loading configuration…
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* ══════════════════════════════
                PAGE HEADER
            ══════════════════════════════ */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold text-foreground leading-tight">Tool access matrix</h2>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                            Control which OHIF Viewer tools are visible per role
                            &nbsp;·&nbsp;
                            <span className="font-medium text-foreground">{ALL_TOOL_IDS.length} tools</span> across{' '}
                            <span className="font-medium text-foreground">{Object.keys(TOOL_CATEGORIES).length} categories</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {hasChanges && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 animate-in fade-in slide-in-from-right-2 duration-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse block shrink-0" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                Unsaved changes
                            </span>
                        </div>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        size="sm"
                        className={cn(
                            'h-9 px-4 text-[11px] font-semibold uppercase tracking-widest rounded-xl transition-all active:scale-95',
                            hasChanges
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25'
                                : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
                        )}
                    >
                        {isSaving
                            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Save className="w-3.5 h-3.5 mr-1.5" />}
                        Save configuration
                    </Button>
                </div>
            </div>

            {/* ══════════════════════════════
                ROLE STAT CARDS
            ══════════════════════════════ */}
            <div className="grid grid-cols-5 gap-3">
                {ROLES.map(role => {
                    const meta = ROLE_META[role];
                    const count = restrictions[role]?.length || 0;
                    const pct = Math.round((count / ALL_TOOL_IDS.length) * 100);
                    return (
                        <div
                            key={role}
                            className="group relative bg-background border border-border rounded-xl p-3.5 transition-all duration-200 hover:shadow-md hover:border-border/70"
                        >
                            {/* header row */}
                            <div className="flex items-start justify-between mb-3 min-h-[20px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[18px] leading-none">{meta.emoji}</span>
                                    <span className="text-[11px] font-semibold text-foreground">{meta.label}</span>
                                </div>
                                {/* quick-action buttons, shown on hover */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -mt-0.5">
                                    <button
                                        onClick={() => handleEnableAllForRole(role)}
                                        title="Enable all tools"
                                        className="w-5 h-5 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                    >
                                        <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDisableAllForRole(role)}
                                        title="Disable all tools"
                                        className="w-5 h-5 flex items-center justify-center rounded text-red-500 hover:bg-red-500/10 transition-colors"
                                    >
                                        <EyeOff className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* count */}
                            <div className="flex items-baseline gap-1 mb-2.5">
                                <span className="text-[22px] font-bold tabular-nums leading-none text-foreground">{count}</span>
                                <span className="text-[11px] text-muted-foreground leading-none">/{ALL_TOOL_IDS.length}</span>
                            </div>

                            {/* progress bar */}
                            <div className="w-full h-[3px] bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', meta.color)}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5">{pct}% enabled</p>
                        </div>
                    );
                })}
            </div>

            {/* ══════════════════════════════
                INFO BANNER
            ══════════════════════════════ */}
            <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-[1px]" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">How it works:</span>{' '}
                    Only checked tools are visible in the Armorray Viewer for each role.
                    If <span className="font-semibold text-foreground">no tools</span> are selected, all tools are shown by default (fail-open).
                    Changes take effect on the next viewer session.
                </p>
            </div>

            {/* ══════════════════════════════
                MATRIX TABLE
            ══════════════════════════════ */}
            <div className="flex-1 min-h-0 rounded-xl border border-border bg-background overflow-hidden">
                <ScrollArea className="h-full w-full">
                    <div className="w-full">
                        <table className="text-sm border-separate border-spacing-0">
                            <colgroup>
                                <col style={{ width: '140px' }} />
                                {ROLES.map(r => <col key={r} style={{ width: '1%', minWidth: '120px' }} />)}
                            </colgroup>

                            {/* ── sticky header ── */}
                            <thead>
                                <tr>
                                    {/* Tool ID th — sticky left + top */}
                                    <th
                                        className="sticky top-0 left-0 z-30 px-4 py-3 text-left border-b border-r border-border"
                                        style={{ backgroundColor: 'hsl(var(--background))' }}
                                    >
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                            Tool ID
                                        </span>
                                    </th>

                                    {/* Role ths — sticky top */}
                                    {ROLES.map(role => {
                                        const meta = ROLE_META[role];
                                        const count = restrictions[role]?.length || 0;
                                        const pct = Math.round((count / ALL_TOOL_IDS.length) * 100);
                                        return (
                                            <th
                                                key={role}
                                                className="sticky top-0 z-20 px-3 py-3 text-center border-b border-r last:border-r-0 border-border"
                                                style={{ backgroundColor: 'hsl(var(--background))' }}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[17px] leading-none">{meta.emoji}</span>
                                                    <span className="text-[10px] font-semibold text-foreground tracking-wide">{meta.label}</span>
                                                    <span className="text-[9px] text-muted-foreground tabular-nums">
                                                        {count}/{ALL_TOOL_IDS.length} · {pct}%
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {Object.entries(TOOL_CATEGORIES).map(([category, catMeta]) => {
                                    const { icon, textColor, rowBg, badgeCls, tools } = catMeta as {
                                        icon: React.ReactNode;
                                        textColor: string;
                                        rowBg: string;
                                        badgeCls: string;
                                        tools: readonly string[];
                                    };

                                    return (
                                        <React.Fragment key={category}>

                                            {/* ─── category header row ─── */}
                                            <tr>
                                                {/* sticky label — same explicit bg */}
                                                <td
                                                    className={cn('sticky left-0 z-10 px-4 py-2.5 border-b border-r border-border', rowBg)}
                                                    style={{ backgroundColor: undefined }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md border', badgeCls)}>
                                                            {icon}
                                                        </span>
                                                        <span className={cn('text-[11px] font-semibold uppercase tracking-wider', textColor)}>
                                                            {category}
                                                        </span>
                                                        <span className="ml-auto text-[9px] font-medium text-muted-foreground tabular-nums">
                                                            {tools.length}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* bulk-toggle cells - ALL / NONE buttons */}
                                                {ROLES.map(role => {
                                                    const allOn = tools.every(t => restrictions[role]?.includes(t));
                                                    return (
                                                        <td
                                                            key={`${category}-${role}`}
                                                            className={cn('py-2.5 px-3 text-center border-b border-r last:border-r-0 border-border', rowBg)}
                                                        >
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleToggleCategory(role, category as keyof typeof TOOL_CATEGORIES, true)}
                                                                    className={cn(
                                                                        'h-7 px-2.5 text-[9px] font-semibold uppercase tracking-wider',
                                                                        allOn
                                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                                                                            : 'text-muted-foreground hover:bg-muted'
                                                                    )}
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    All
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleToggleCategory(role, category as keyof typeof TOOL_CATEGORIES, false)}
                                                                    className={cn(
                                                                        'h-7 px-2.5 text-[9px] font-semibold uppercase tracking-wider',
                                                                        !allOn
                                                                            ? 'bg-muted border-border text-muted-foreground'
                                                                            : 'text-muted-foreground hover:bg-muted'
                                                                    )}
                                                                >
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    None
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* ─── individual tool rows ─── */}
                                            {tools.map((toolId, idx) => (
                                                <tr
                                                    key={toolId}
                                                    className="group/row hover:bg-indigo-500/[0.035] transition-colors duration-100"
                                                >
                                                    {/* sticky tool-name cell */}
                                                    <td
                                                        className={cn(
                                                            'sticky left-0 z-10 pl-4 pr-4 py-[9px] border-r border-border',
                                                            idx < tools.length - 1 ? 'border-b border-b-border/40' : ''
                                                        )}
                                                        style={{ backgroundColor: 'hsl(var(--background))' }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted/50 text-muted-foreground group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 group-hover/row:bg-indigo-500/10 transition-colors">
                                                                <ViewerToolIcon toolId={toolId} className="w-4 h-4" />
                                                            </div>
                                                            <code className="text-[11px] font-mono text-muted-foreground group-hover/row:text-foreground transition-colors">
                                                                {toolId}
                                                            </code>
                                                        </div>
                                                    </td>

                                                    {/* toggle cells using Switch component */}
                                                    {ROLES.map(role => {
                                                        const isEnabled = restrictions[role]?.includes(toolId) || false;
                                                        const wasEnabled = originalRestrictions[role]?.includes(toolId) || false;
                                                        const changed = isEnabled !== wasEnabled;
                                                        return (
                                                            <td
                                                                key={`${toolId}-${role}`}
                                                                className={cn(
                                                                    'py-[9px] px-3 text-center border-r last:border-r-0 border-border/50',
                                                                    idx < tools.length - 1 ? 'border-b border-b-border/40' : ''
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-center">
                                                                    <Switch
                                                                        checked={isEnabled}
                                                                        onCheckedChange={() => handleToggleTool(role, toolId)}
                                                                        className={cn(
                                                                            changed && 'ring-2 ring-amber-400/50 ring-offset-1'
                                                                        )}
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}

                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </div>

        </div>
    );
}