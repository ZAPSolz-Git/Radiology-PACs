import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Users,
    Lock,
    History,
    LayoutDashboard,
    LogOut,
    ChevronRight,
    ChevronLeft,
    Activity,
    Clock,
    Zap,
    DollarSign,
    FileText,
    Wallet,
    BarChart3,
    HardDrive,
    LucideIcon,
    Server,
    Settings2,
    Key
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export type AdminSection = 'overview' | 'users' | 'rbac' | 'security' | 'audit' | 'workflow' | 'sla' | 'alerts' | 'pricing' | 'invoices' | 'payouts' | 'analytics' | 'backups' | 'studies' | 'orthanc' | 'viewer' | 'apikeys';

interface SidebarItemProps {
    id: AdminSection;
    label: string;
    icon: LucideIcon;
    active: boolean;
    onClick: (id: AdminSection) => void;
    innerRef?: React.RefObject<HTMLButtonElement>;
    isCollapsed?: boolean;
}

const SidebarItem = ({ id, label, icon: Icon, active, onClick, innerRef, isCollapsed }: SidebarItemProps) => {
    const content = (
        <Button
            ref={innerRef}
            variant="ghost"
            className={cn(
                "w-full gap-3 px-4 py-6 rounded-xl transition-all duration-200",
                active
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isCollapsed ? "justify-center px-0" : "justify-start"
            )}
            onClick={() => onClick(id)}
        >
            <Icon className={cn("w-5 h-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            {!isCollapsed && (
                <>
                    <span className="font-semibold truncate">{label}</span>
                    {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50 shrink-0" />}
                </>
            )}
        </Button>
    );

    if (isCollapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return content;
};

export interface AdminSidebarProps {
    activeSection: AdminSection;
    setActiveSection: (section: AdminSection) => void;
    onLogout: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function SidebarContent({ activeSection, setActiveSection, onLogout, isCollapsed, onToggleCollapse }: AdminSidebarProps) {
    const itemRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

    React.useEffect(() => {
        const activeRef = itemRefs.current[activeSection];
        if (activeRef) {
            activeRef.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [activeSection]);

    const setRef = (id: string) => (el: HTMLButtonElement | null) => {
        itemRefs.current[id] = el;
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-background overflow-hidden">
                {/* Sticky Header */}
                <div className={cn(
                    "p-6 shrink-0 border-b border-border/10 transition-all duration-300",
                    isCollapsed ? "p-4 flex flex-col items-center justify-center" : "p-8 pb-4"
                )}>
                    <div className={cn(
                        "flex items-center gap-3",
                        isCollapsed ? "justify-center" : "justify-start"
                    )}>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30 shrink-0">
                            A
                        </div>
                        {!isCollapsed && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <h2 className="font-black text-lg tracking-tight whitespace-nowrap">Admin OS</h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">Master Control Unit</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Navigation */}
                <ScrollArea className="flex-1">
                    <nav className={cn(
                        "space-y-2 pb-8 transition-all duration-300",
                        isCollapsed ? "px-3 py-6" : "px-8 py-6"
                    )}>
                        <SidebarItem
                            id="overview"
                            label="Overview"
                            icon={LayoutDashboard}
                            active={activeSection === 'overview'}
                            onClick={setActiveSection}
                            innerRef={setRef('overview') as any}
                            isCollapsed={isCollapsed}
                        />
                        <div className={cn("h-4", isCollapsed && "h-2")} />
                        {!isCollapsed && (
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-4 mb-2 animate-in fade-in duration-500">Management</p>
                        )}
                        <SidebarItem
                            id="users"
                            label="User Directory"
                            icon={Users}
                            active={activeSection === 'users'}
                            onClick={setActiveSection}
                            innerRef={setRef('users') as any}
                            isCollapsed={isCollapsed}
                        />

                        <SidebarItem
                            id="studies"
                            label="Browse Studies"
                            icon={HardDrive}
                            active={activeSection === 'studies'}
                            onClick={setActiveSection}
                            innerRef={setRef('studies') as any}
                            isCollapsed={isCollapsed}
                        />

                        <div className={cn("h-4", isCollapsed && "h-2")} />
                        {!isCollapsed && (
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-4 mb-2 animate-in fade-in duration-500">Systems</p>
                        )}
                        <SidebarItem
                            id="orthanc"
                            label="PACS Vault"
                            icon={Server} // Ensure Server is imported from lucide-react if not already
                            active={activeSection === 'orthanc'}
                            onClick={setActiveSection}
                            innerRef={setRef('orthanc') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="viewer"
                            label="Viewer Control"
                            icon={Settings2}
                            active={activeSection === 'viewer'}
                            onClick={setActiveSection}
                            innerRef={setRef('viewer') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="security"
                            label="Security Engine"
                            icon={Lock}
                            active={activeSection === 'security'}
                            onClick={setActiveSection}
                            innerRef={setRef('security') as any}
                            isCollapsed={isCollapsed}
                        />
                        {/*
                        <SidebarItem
                            id="apikeys"
                            label="API Keys"
                            icon={Key}
                            active={activeSection === 'apikeys'}
                            onClick={setActiveSection}
                            innerRef={setRef('apikeys') as any}
                            isCollapsed={isCollapsed}
                        />
                        */}
                        <SidebarItem
                            id="audit"
                            label="Audit Trails"
                            icon={History}
                            active={activeSection === 'audit'}
                            onClick={setActiveSection}
                            innerRef={setRef('audit') as any}
                            isCollapsed={isCollapsed}
                        />
                        <div className={cn("h-4", isCollapsed && "h-2")} />
                        {!isCollapsed && (
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-4 mb-2 animate-in fade-in duration-500">Operations</p>
                        )}
                        <SidebarItem
                            id="workflow"
                            label="Workflow Feed"
                            icon={Activity}
                            active={activeSection === 'workflow'}
                            onClick={setActiveSection}
                            innerRef={setRef('workflow') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="sla"
                            label="SLA Monitor"
                            icon={Clock}
                            active={activeSection === 'sla'}
                            onClick={setActiveSection}
                            innerRef={setRef('sla') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="alerts"
                            label="Alert Center"
                            icon={Zap}
                            active={activeSection === 'alerts'}
                            onClick={setActiveSection}
                            innerRef={setRef('alerts') as any}
                            isCollapsed={isCollapsed}
                        />
                        <div className={cn("h-4", isCollapsed && "h-2")} />
                        {!isCollapsed && (
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-4 mb-2 animate-in fade-in duration-500">Financials</p>
                        )}
                        <SidebarItem
                            id="pricing"
                            label="Tariff Master"
                            icon={DollarSign}
                            active={activeSection === 'pricing'}
                            onClick={setActiveSection}
                            innerRef={setRef('pricing') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="invoices"
                            label="Hospital Billing"
                            icon={FileText}
                            active={activeSection === 'invoices'}
                            onClick={setActiveSection}
                            innerRef={setRef('invoices') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="payouts"
                            label="Doctor Payouts"
                            icon={Wallet}
                            active={activeSection === 'payouts'}
                            onClick={setActiveSection}
                            innerRef={setRef('payouts') as any}
                            isCollapsed={isCollapsed}
                        />
                        <SidebarItem
                            id="analytics"
                            label="Revenue Hub"
                            icon={BarChart3}
                            active={activeSection === 'analytics'}
                            onClick={setActiveSection}
                            innerRef={setRef('analytics') as any}
                            isCollapsed={isCollapsed}
                        />

                        <div className={cn("h-4", isCollapsed && "h-2")} />
                        {!isCollapsed && (
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-4 mb-2 animate-in fade-in duration-500">Pillars</p>
                        )}
                        <SidebarItem
                            id="backups"
                            label="Snapshot Vault"
                            icon={HardDrive}
                            active={activeSection === 'backups'}
                            onClick={setActiveSection}
                            innerRef={setRef('backups') as any}
                            isCollapsed={isCollapsed}
                        />
                    </nav>
                </ScrollArea>

                {/* Sticky Footer */}
                <div className={cn(
                    "p-4 border-t border-border bg-background shrink-0 transition-all duration-300",
                    isCollapsed ? "flex flex-col items-center" : ""
                )}>
                    {isCollapsed ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-10 h-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                    onClick={onLogout}
                                >
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-bold">
                                Logout Console
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 py-6 rounded-xl animate-in fade-in duration-500"
                            onClick={onLogout}
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            <span className="font-semibold whitespace-nowrap">Logout Console</span>
                        </Button>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}

export function AdminSidebar(props: AdminSidebarProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    // Sidebar is expanded if it's not manually collapsed OR if it's hovered
    const isExpanded = !props.isCollapsed || isHovered;

    return (
        <aside
            className={cn(
                "hidden lg:flex bg-background border-r border-border flex-col h-screen sticky top-0 shrink-0 transition-all duration-300 ease-in-out z-30 group/sidebar relative",
                isExpanded ? "w-72" : "w-20"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <SidebarContent
                {...props}
                isCollapsed={!isExpanded}
            />

            {/* Premium Floating Toggle Button (visible on group hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleCollapse?.();
                }}
                className={cn(
                    "absolute -right-4 top-[84px] w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-md transition-all duration-300 z-50",
                    "hover:scale-110 active:scale-95 hover:bg-muted group-hover/sidebar:opacity-100 lg:opacity-0",
                    isExpanded ? "rotate-0" : "rotate-180"
                )}
            >
                <ChevronLeft className="w-4 h-4 text-primary" />
            </button>
        </aside>
    );
}
