import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button, Header, Icons, useModal } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';
import { preserveQueryParameters } from '@ohif/app';
import { Types } from '@ohif/core';
import { ReportEditorWindow } from '../Components/ReportEditor/ReportEditorWindow';
import usePatientInfo from '../hooks/usePatientInfo';
import { RadiologistService } from '../services/BackendService';
import ToolbarLayoutSelector from '../Toolbar/ToolbarLayoutSelector';

/**
 * Quick-access tools shown in the header center strip.
 * Each entry maps a tool ID → its SVG icon name + display label.
 * The tool IDs must match the ones registered in toolbarButtons.ts.
 */
const HEADER_QUICK_TOOLS = [
  { id: 'WindowLevel', icon: 'tool-window-level', label: 'W/L' },
  { id: 'Pan',         icon: 'tool-move',         label: 'Pan' },
  { id: 'Zoom',        icon: 'tool-zoom',         label: 'Zoom' },
  { id: 'Layout',      icon: 'tool-layout',       label: 'Layout' },
  { id: 'Probe',       icon: 'tool-probe',         label: 'Probe' },
] as const;

function ViewerHeader({ appConfig }: withAppTypes<{ appConfig: AppTypes.Config }>) {
  const { servicesManager, extensionManager, commandsManager } = useSystem();
  const { customizationService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    // Redirect to the main application root instead of the OHIF study list.
    // The main frontend handles role-based routing (e.g., /radiologist/dashboard).
    window.location.href = '/';
  };

  const { t } = useTranslation();
  const { show } = useModal();
  const { patientInfo } = usePatientInfo();
  const [caseId, setCaseId] = React.useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const fetchCaseId = async () => {
      const searchParams = new URLSearchParams(location.search);
      const hashParams = new URLSearchParams(location.hash?.substring(location.hash.indexOf('?') + 1) || '');

      const cid = searchParams.get('caseId') || hashParams.get('caseId');
      if (cid) {
        setCaseId(cid);
        return;
      }

      // If no caseId, try to find it via StudyInstanceUID
      const studyUIDs = searchParams.get('StudyInstanceUIDs') || hashParams.get('StudyInstanceUIDs') ||
        searchParams.get('StudyInstanceUID') || hashParams.get('StudyInstanceUID');

      console.log('[ViewerHeader] Resolved StudyUIDs param:', studyUIDs);

      if (studyUIDs) {
        try {
          // StudyInstanceUIDs can be comma-separated, take the first one
          const firstUID = studyUIDs.split(',')[0].trim();
          console.log('[ViewerHeader] Attempting to find case for UID:', firstUID);
          const kase = await RadiologistService.findCaseByStudyUID(firstUID);
          if (kase) {
            setCaseId(kase._id || kase.id);
          }
        } catch (err) {
          console.error('Error finding case by study UID:', err);
        }
      }
    };

    fetchCaseId();
  }, [location]);

  console.log('ViewerHeader - caseId:', caseId);

  const shareRole = window.sessionStorage.getItem('shareRole');
  const isViewOnly = shareRole === 'user';

  const handleOpenReport = () => {
    if (isViewOnly) return;
    if (!caseId) {
      alert('Case ID not found for this study. Please ensure the study is linked to a case.');
      return;
    }
    setIsReportOpen(true);
  };

  // ─── Quick-access toolbar: hook into OHIF toolbar system ───
  const { toolbarService, viewportGridService } = servicesManager.services;

  // Track which tool is currently active so we can highlight it
  const [activeTool, setActiveTool] = useState<string>('');

  // Helper: scan registered buttons and find which quick-tool is currently active
  const syncActiveTool = useCallback(() => {
    for (const qt of HEADER_QUICK_TOOLS) {
      const btn = toolbarService.getButton(qt.id);
      if ((btn?.props as any)?.isActive) {
        setActiveTool(qt.id);
        return;
      }
    }
    setActiveTool('');
  }, [toolbarService]);

  useEffect(() => {
    // TOOL_BAR_MODIFIED fires after refreshToolbarState → setButtons — this is
    // where isActive gets updated on button.props after evaluate runs.
    const sub = toolbarService.subscribe(
      toolbarService.EVENTS.TOOL_BAR_MODIFIED,
      syncActiveTool
    );
    // Run once on mount to pick up the current state
    syncActiveTool();
    return () => sub.unsubscribe();
  }, [toolbarService, syncActiveTool]);

  // Build the list of quick tools that the current role is allowed to see
  const allowedQuickTools = useMemo(() => {
    let filteredTools = [...HEADER_QUICK_TOOLS];

    // 1. Role-based filtering from backend (set in basic mode init)
    const allowedFromConfig: string[] | undefined = (window as any).__appConfig?.allowedTools;
    if (allowedFromConfig && allowedFromConfig.length > 0) {
      filteredTools = filteredTools.filter(qt => allowedFromConfig.includes(qt.id));
    }

    // 2. Share link restrictions (if applicable, same logic as Toolbar.tsx)
    try {
      const shareRole = window.sessionStorage.getItem('shareRole');
      const shareAllowedToolsStr = window.sessionStorage.getItem('shareAllowedTools');

      if (shareRole && shareAllowedToolsStr) {
        const shareAllowedTools = JSON.parse(shareAllowedToolsStr);
        if (shareRole === 'user' || shareAllowedTools.length > 0) {
          filteredTools = filteredTools.filter(qt => {
            // Strict minimum tools for "user" role if no tools explicitly allowed
            if (shareAllowedTools.length === 0 && shareRole === 'user') {
              const safeTools = ['Zoom', 'Pan', 'Reset'];
              return safeTools.includes(qt.id);
            }
            return shareAllowedTools.includes(qt.id);
          });
        }
      }
    } catch (err) {
      console.warn('[ViewerHeader] Failed to apply share tool restrictions:', err);
    }

    return filteredTools;
  }, []);

  // Handler: activate a quick-access tool via toolbarService.recordInteraction.
  // This runs the command AND refreshes toolbar state (so isActive updates).
  const handleQuickToolClick = useCallback(
    (toolId: string) => {
      if (toolId === 'Layout') {
        // Layout uses its own popover component (ToolbarLayoutSelector)
        // so we don't need to manually process interactions here.
        return;
      }

      const viewportId = viewportGridService.getActiveViewportId();
      const buttonProps = toolbarService.getButtonProps(toolId);
      if (!buttonProps) return;

      toolbarService.recordInteraction(
        { itemId: toolId, ...buttonProps },
        { refreshProps: { viewportId } }
      );
    },
    [toolbarService, viewportGridService]
  );

  const UserPreferencesModal = customizationService.getCustomization(
    'ohif.userPreferencesModal'
  ) as Types.MenuComponentCustomization;

  const menuOptions = [
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
  ];

  if (appConfig.oidc) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }

  // Undo/Redo buttons — extracted into a variable so they can be passed
  // as the UndoRedo prop. The Header renders this prop in BOTH the desktop
  // right-side area AND the mobile center column. Putting them in `children`
  // caused them to be invisible on mobile because children is only rendered
  // in the desktop layout.
  const undoRedoButtons = (
    <div className="text-primary flex cursor-pointer items-center bg-white/[0.03] border border-white/5 rounded-xl px-1 py-0.5 shadow-inner">
      <Button
        variant="ghost"
        className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg h-9 w-9"
        onClick={() => {
          commandsManager.run('undo');
        }}
      >
        <Icons.Undo className="w-5 h-5" />
      </Button>
      <Button
        variant="ghost"
        className="hover:bg-primary/10 hover:text-primary transition-all rounded-lg h-9 w-9"
        onClick={() => {
          commandsManager.run('redo');
        }}
      >
        <Icons.Redo className="w-5 h-5" />
      </Button>
    </div>
  );

  return (
    <>
      <Header
        menuOptions={menuOptions}
        isReturnEnabled={!!appConfig.showStudyList}
        onClickReturnButton={onClickReturnButton}
        WhiteLabeling={appConfig.whiteLabeling}
        Secondary={<Toolbar buttonSection="secondary" />}
        PatientInfo={
          appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
            <HeaderPatientInfo
              servicesManager={servicesManager}
              appConfig={appConfig}
            />
          )
        }
        UndoRedo={undoRedoButtons}
        onOpenReport={isViewOnly ? undefined : handleOpenReport}
      >
        {/* Desktop center toolbar — quick-access tools for the current role */}
        <div className="relative flex items-center justify-center gap-1">
          {allowedQuickTools.length > 0 && (
            <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1 py-0.5 backdrop-blur-sm shadow-inner">
              {allowedQuickTools.map(qt => {
                const isActive = activeTool === qt.id;
                const btnContent = (
                  <button
                    key={qt.id}
                    title={qt.label}
                    onClick={() => handleQuickToolClick(qt.id)}
                    className={[
                      'group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide',
                      'transition-all duration-150 select-none cursor-pointer',
                      isActive
                        ? 'bg-primary/20 text-primary shadow-[0_0_8px_rgba(45,212,191,0.15)]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <Icons.ByName
                      name={qt.icon}
                      className={[
                        'w-4 h-4 transition-colors duration-150',
                        isActive ? 'text-primary' : 'text-white/40 group-hover:text-white/70',
                      ].join(' ')}
                    />
                    <span className="hidden lg:inline">{qt.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-primary/60" />
                    )}
                  </button>
                );

                if (qt.id === 'Layout') {
                  // Rendering OHIF's layout popup with our custom styled trigger
                  return (
                    <ToolbarLayoutSelector
                      key={qt.id}
                      commandsManager={commandsManager}
                      servicesManager={servicesManager}
                      customTrigger={btnContent}
                    />
                  );
                }

                return btnContent;
              })}
            </div>
          )}
        </div>
      </Header>
      {isReportOpen && caseId && createPortal(
        <ReportEditorWindow
          caseId={caseId}
          patientName={patientInfo?.PatientName || 'Unknown Patient'}
          onClose={() => setIsReportOpen(false)}
        />,
        document.body
      )}
    </>
  );
}

export default ViewerHeader;