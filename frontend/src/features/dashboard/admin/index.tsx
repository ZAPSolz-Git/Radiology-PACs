import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AdminSidebar, AdminSection, SidebarContent } from '../../admin/components/AdminSidebar';
import { User as UserIcon, Menu, Users, Lock, History, Activity, Server, Clock, Zap, DollarSign, FileText, Wallet, BarChart3, HardDrive, ShieldCheck, ArrowRight, AlertTriangle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import { ScrollArea } from '@/components/ui/scroll-area';
import { UserList } from '../../admin/components/UserManagement/UserList';
import { UserModal } from '../../admin/components/UserManagement/UserModal';
import { AdminService } from '../../admin/services/AdminService';
import { AdminUser } from '../../admin/types';
import { toast } from 'sonner';
import { SecurityDashboard } from '../../admin/components/Security/SecurityDashboard';
import { AuditLogTable } from '../../admin/components/Audit/AuditLogTable';
import { LoginActivityTable } from '../../admin/components/Audit/LoginActivityTable';
import { WorkflowDashboard } from '../../admin/components/Workflow/WorkflowDashboard';
import { SLAMonitor } from '../../admin/components/Workflow/SLAMonitor';
import { AlertsCenter } from '../../admin/components/Workflow/AlertsCenter';
import { PricingManager } from '../../admin/components/Billing/PricingManager';
import { InvoiceList } from '../../admin/components/Billing/InvoiceList';
import { PayoutManager } from '../../admin/components/Billing/PayoutManager';
import { FinancialAnalytics } from '../../admin/components/Billing/FinancialAnalytics';
import { BackupManager } from '../../admin/components/Compliance/BackupManager';
import { BrowseStudies } from '../../admin/components/Studies/BrowseStudies';
import { OrthancManager } from '../../admin/components/Orthanc/OrthancManager';
import { ToolControlConsole } from '../../admin/components/Viewer/ToolControlConsole';
import { ApiKeyManager } from '../../admin/components/Security/ApiKeyManager';

// Navigation card config
const NAV_CARDS: { id: AdminSection; label: string; icon: any; description: string; color: string }[] = [
    { id: 'users', label: 'User Directory', icon: Users, description: 'Manage operators & roles', color: 'from-blue-500 to-blue-600' },
    { id: 'studies', label: 'Browse Studies', icon: HardDrive, description: 'View all DICOM studies', color: 'from-cyan-500 to-cyan-600' },
    { id: 'orthanc', label: 'PACS Vault', icon: Server, description: 'Orthanc server administration', color: 'from-fuchsia-500 to-fuchsia-600' },
    { id: 'viewer', label: 'Viewer Config', icon: Settings2, description: 'Role-based tools map', color: 'from-indigo-600 to-blue-700' },
    { id: 'security', label: 'Security Engine', icon: Lock, description: 'Hardening & policies', color: 'from-red-500 to-red-600' },
    { id: 'audit', label: 'Audit Trails', icon: History, description: 'System event logs', color: 'from-amber-500 to-amber-600' },
    { id: 'workflow', label: 'Workflow Feed', icon: Activity, description: 'Live clinical throughput', color: 'from-green-500 to-green-600' },
    { id: 'sla', label: 'SLA Monitor', icon: Clock, description: 'TAT & deadline tracking', color: 'from-orange-500 to-orange-600' },
    { id: 'alerts', label: 'Alert Center', icon: Zap, description: 'Automated response', color: 'from-yellow-500 to-yellow-600' },
    { id: 'pricing', label: 'Tariff Master', icon: DollarSign, description: 'Pricing configuration', color: 'from-emerald-500 to-emerald-600' },
    { id: 'invoices', label: 'Hospital Billing', icon: FileText, description: 'Invoice management', color: 'from-indigo-500 to-indigo-600' },
    { id: 'payouts', label: 'Doctor Payouts', icon: Wallet, description: 'Payout console', color: 'from-purple-500 to-purple-600' },
    { id: 'analytics', label: 'Revenue Hub', icon: BarChart3, description: 'Financial analytics', color: 'from-pink-500 to-pink-600' },
    { id: 'backups', label: 'Snapshot Vault', icon: HardDrive, description: 'Backup & recovery', color: 'from-slate-500 to-slate-600' },
    { id: 'apikeys', label: 'API Keys', icon: Lock, description: 'External API access', color: 'from-teal-500 to-teal-600' },
];

export default function AdminDashboard() {
    const { user, logout } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeSection, setActiveSectionState] = useState<AdminSection>(
        () => (searchParams.get('section') as AdminSection) || 'overview'
    );
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [overviewStats, setOverviewStats] = useState<any>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed');
        return saved === 'true';
    });
    const [selectedRoleTab, setSelectedRoleTab] = useState('all');

    useEffect(() => {
        localStorage.setItem('admin_sidebar_collapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    const setActiveSection = (section: AdminSection) => {
        setActiveSectionState(section);
        setSearchParams({ section }, { replace: true });
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await AdminService.getUsers({
                search: searchQuery,
                role: (activeSection === 'overview' || activeSection === 'users') ? undefined : activeSection,
            });
            setUsers(data);
        } catch (err) {
            toast.error("Failed to load user directory");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOverviewStats = useCallback(async () => {
        try {
            const data = await AdminService.getOverviewStats();
            setOverviewStats(data);
        } catch (err) {
            console.error("Failed to fetch overview stats");
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
            if (activeSection === 'overview') {
                fetchOverviewStats();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeSection]);


    const handleSectionChange = (section: AdminSection) => {
        setActiveSection(section);
        setIsMobileMenuOpen(false);
    };

    const handleCreateUser = async (data: Partial<AdminUser>) => {
        try {
            if (selectedUser) {
                await AdminService.updateUser(selectedUser._id, data);
                toast.success("User profile updated successfully");
            } else {
                await AdminService.createUser(data);
                toast.success("New user onboarded successfully");
            }
            setIsUserModalOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error("Operation failed");
        }
    };

    const handleToggleStatus = async (user: AdminUser) => {
        const newStatus = user.status === 'active' ? 'deactivated' : 'active';
        try {
            await AdminService.updateUser(user._id, { status: newStatus });
            toast.success(`User access ${newStatus === 'active' ? 'restored' : 'suspended'}`);
            fetchUsers();
        } catch (err) {
            toast.error("Status change failed");
        }
    };

    const handleDeleteUser = async (user: AdminUser) => {
        try {
            await AdminService.deleteUser(user._id);
            toast.success("User data purged from system");
            fetchUsers();
        } catch (err) {
            toast.error("Deletion failed");
        }
    };

    const handleResetPassword = (user: AdminUser) => {
        toast.info(`Password reset link sent to ${user.email}`);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="space-y-8">
                        {/* Live Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: 'Active Sessions', value: overviewStats?.activeSessions ?? '—', icon: '🟢', trend: 'Online now' },
                                { label: 'Total Users', value: overviewStats?.totalUsers ?? '—', icon: '👥', trend: 'All roles' },
                                { label: 'Radiologists', value: overviewStats?.roles?.radiologist ?? '—', icon: '🩺', trend: 'Medical Imaging' },
                                { label: 'Technicians', value: overviewStats?.roles?.technician ?? '—', icon: '🔧', trend: 'Operations' },
                                { label: 'Pending Queue', value: overviewStats?.pendingCases ?? '—', icon: '📋', trend: 'Awaiting action' },
                                {
                                    label: 'Security Alerts',
                                    value: overviewStats?.securityAlerts ?? '—',
                                    icon: (overviewStats?.securityAlerts ?? 0) > 0 ? '🔴' : '🟢',
                                    trend: (overviewStats?.securityAlerts ?? 0) > 0 ? 'Needs attention' : 'Secure'
                                },
                            ].map((stat, i) => (
                                <div key={i} className="bg-background p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-base">{stat.icon}</span>
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-foreground">{stat.value}</div>
                                    <div className="mt-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{stat.trend}</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Navigation Grid */}
                        <div>
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Quick Navigation</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {NAV_CARDS.map((card) => {
                                    const Icon = card.icon;
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => handleSectionChange(card.id)}
                                            className="group bg-background p-5 rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-indigo-500/30 transition-all duration-200 text-left cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                                                    <Icon className="w-4 h-4 text-white" />
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-200" />
                                            </div>
                                            <div className="text-sm font-bold text-foreground group-hover:text-indigo-600 transition-colors">{card.label}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{card.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* System Pulse */}
                        <div>
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">System Pulse</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Last Backup</div>
                                    <div className="text-lg font-bold text-foreground">
                                        {overviewStats?.lastBackup?.backupId ?? 'No backups'}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        {formatTimeAgo(overviewStats?.lastBackup?.timestamp)}
                                    </div>
                                </div>
                                <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Revenue This Month</div>
                                    <div className="text-lg font-bold text-foreground">
                                        {formatCurrency(overviewStats?.revenueThisMonth ?? 0)}
                                    </div>
                                    <div className="text-[10px] text-emerald-500 font-bold mt-1">From invoices</div>
                                </div>
                                <div className="bg-background p-5 rounded-2xl border border-border shadow-sm">
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Finalized Today</div>
                                    <div className="text-lg font-bold text-foreground">
                                        {overviewStats?.finalizedToday ?? 0} cases
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">Completed reports</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'users':
                const roleCounts = {
                    all: users.length,
                    admin: users.filter(u => u.role === 'admin').length,
                    radiologist: users.filter(u => u.role === 'radiologist').length,
                    technician: users.filter(u => u.role === 'technician').length,
                    qa: users.filter(u => u.role === 'qa').length,
                    institution: users.filter(u => u.role === 'institution').length,
                };

                const filteredUsers = selectedRoleTab === 'all'
                    ? users
                    : users.filter(u => (u.role as string) === selectedRoleTab);

                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    User Directory
                                </h2>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Manage personnel & institutional access</p>
                            </div>
                            <Button
                                onClick={() => { setSelectedUser(null); setIsUserModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                Onboard New Operator
                            </Button>
                        </div>

                        <Tabs value={selectedRoleTab} onValueChange={setSelectedRoleTab} className="w-full">
                            <TabsList className="bg-muted/50 p-1 rounded-xl h-12 border border-border/50">
                                <TabsTrigger value="all" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    All <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.all}</span>
                                </TabsTrigger>
                                <TabsTrigger value="admin" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Admins <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.admin}</span>
                                </TabsTrigger>
                                <TabsTrigger value="radiologist" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Radiologists <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.radiologist}</span>
                                </TabsTrigger>
                                <TabsTrigger value="technician" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Technicians <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.technician}</span>
                                </TabsTrigger>
                                <TabsTrigger value="qa" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    QA <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.qa}</span>
                                </TabsTrigger>
                                <TabsTrigger value="institution" className="rounded-lg px-4 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    Institutions <span className="ml-2 opacity-50 bg-muted px-1.5 py-0.5 rounded-md">{roleCounts.institution}</span>
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-6">
                                <UserList
                                    users={filteredUsers}
                                    onEdit={(u) => { setSelectedUser(u); setIsUserModalOpen(true); }}
                                    onToggleStatus={handleToggleStatus}
                                    onResetPassword={handleResetPassword}
                                    onDelete={handleDeleteUser}
                                    showHospital={selectedRoleTab === 'technician'}
                                />
                            </div>
                        </Tabs>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight">Security Hardening Engine</h2>
                        </div>
                        <SecurityDashboard />
                    </div>
                );
            case 'audit':
                const auditTab = searchParams.get('subtab') || 'logs';
                const setAuditTab = (tab: string) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('subtab', tab);
                    setSearchParams(newParams, { replace: true });
                };

                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <History className="w-5 h-5 text-indigo-600" />
                                Monitoring & Audit
                            </h2>
                            <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/50 shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAuditTab('logs')}
                                    className={cn(
                                        "h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all",
                                        auditTab === 'logs'
                                            ? "bg-background text-indigo-600 shadow-sm border border-border/50"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                                    )}
                                >
                                    <FileText className="w-3 h-3 mr-2" />
                                    System Logs
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAuditTab('sessions')}
                                    className={cn(
                                        "h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] transition-all",
                                        auditTab === 'sessions'
                                            ? "bg-background text-indigo-600 shadow-sm border border-border/50"
                                            : "text-muted-foreground hover:text-foreground hover:bg-white/50",
                                    )}
                                >
                                    <Activity className="w-3 h-3 mr-2" />
                                    Sessions
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {auditTab === 'logs' ? (
                                <div className="space-y-6">
                                    <div className="p-1">
                                        <AuditLogTable />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-1">
                                        <LoginActivityTable />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'workflow':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-600" />
                                Live Clinical Throughput
                            </h2>
                        </div>
                        <WorkflowDashboard />
                    </div>
                );
            case 'sla':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                TAT & SLA Tracking
                            </h2>
                        </div>
                        <SLAMonitor />
                    </div>
                );
            case 'alerts':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                                Automated Response Center
                            </h2>
                        </div>
                        <AlertsCenter />
                    </div>
                );
            case 'pricing':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                                Tariff & Pricing Master
                            </h2>
                        </div>
                        <PricingManager />
                    </div>
                );
            case 'invoices':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Hospital Billing & Invoices
                            </h2>
                        </div>
                        <InvoiceList />
                    </div>
                );
            case 'payouts':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-indigo-600" />
                                Physician Payout Console
                            </h2>
                        </div>
                        <PayoutManager />
                    </div>
                );
            case 'analytics':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                Revenue & Margins Hub
                            </h2>
                        </div>
                        <FinancialAnalytics />
                    </div>
                );


            case 'backups':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-indigo-600" />
                                Snapshot & Recovery Vault
                            </h2>
                        </div>
                        <BackupManager />
                    </div>
                );

            case 'orthanc':
                return <OrthancManager />;

            case 'viewer':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-indigo-600" />
                                DICOM Viewer Control
                            </h2>
                        </div>
                        <ToolControlConsole />
                    </div>
                );

            case 'studies':
                return <BrowseStudies />;

            case 'apikeys':
                return <ApiKeyManager />;
                
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-muted/20 flex overflow-hidden">
            <AdminSidebar
                activeSection={activeSection}
                setActiveSection={handleSectionChange}
                onLogout={logout}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <header className="h-20 bg-background/95 backdrop-blur-md border-b border-border px-4 sm:px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 w-full supports-[backdrop-filter]:bg-background/80">
                    <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-72 flex flex-col">
                                <SheetHeader className="sr-only">
                                    <SheetTitle>Admin Navigation</SheetTitle>
                                </SheetHeader>
                                <ScrollArea className="flex-1">
                                    <SidebarContent
                                        activeSection={activeSection}
                                        setActiveSection={handleSectionChange}
                                        onLogout={logout}
                                        isCollapsed={false}
                                        onToggleCollapse={() => { }}
                                    />
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>



                    </div>

                    <div className="flex items-center gap-4">

                        <div className="h-8 w-px bg-border mx-2" />
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold leading-tight">{user?.name}</div>
                                <div className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Super Admin</div>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
                                <UserIcon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* <div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground capitalize">
                                {activeSection === 'overview' ? 'Welcome back, Commander' : activeSection.replace('-', ' ')}
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mt-1">
                                {activeSection === 'overview' ? 'System health and operational overview' : `Managing ${activeSection} components`}
                            </p>
                        </div> */}

                        {renderContent()}
                    </div>
                </div>
            </main>

            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSubmit={handleCreateUser}
                user={selectedUser}
            />
        </div>
    );
}
