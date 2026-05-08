import React, { useState } from 'react';
import { Icons, PanelSection, ToolSettings, IconPresentationProvider, ToolButton } from '@ohif/ui-next';
import { useSystem, useToolbar, useActiveToolOptions } from '@ohif/core';
import { useTranslation } from 'react-i18next';

/**
 * Props for the Toolbox component that renders a collection of toolbar button sections.
 */
interface ToolboxProps {
  buttonSectionId: string;
  title: string;
}

export function Toolbox({ buttonSectionId, title }: ToolboxProps) {
  const { servicesManager } = useSystem();
  const { t } = useTranslation();

  const { toolbarService, customizationService } = servicesManager.services;
  const [showConfig, setShowConfig] = useState(false);

  const { toolbarButtons: toolboxSections, onInteraction } = useToolbar({
    buttonSection: buttonSectionId,
  });

  const { activeToolOptions } = useActiveToolOptions({ buttonSectionId });

  if (!toolboxSections.length) {
    return null;
  }

  if (!toolboxSections.every(section => section.componentProps.buttonSection)) {
    throw new Error(
      'Toolbox accepts only button sections at the top level, not buttons. Create at least one button section.'
    );
  }

  const handleInteraction = args => {
    const { viewportGridService } = servicesManager.services;
    const viewportId = viewportGridService.getActiveViewportId();
    onInteraction?.({ ...args, viewportId });
  };

  const CustomConfigComponent = customizationService.getCustomization(`${buttonSectionId}.config`);

  return (
    <div className="flex flex-col bg-[#060a10]">
      {/* Section Header */}
      <div className="flex h-[44px] items-center justify-between border-b border-primary/10 bg-[#0a0f18] px-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 rounded-full bg-primary shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
          <span className="text-[13px] font-semibold tracking-wide text-foreground/90">
            {t(title)}
          </span>
        </div>
        {CustomConfigComponent && (
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/5 transition-all hover:bg-primary/15 hover:scale-110 active:scale-95"
            onClick={e => {
              e.stopPropagation();
              setShowConfig(!showConfig);
            }}
          >
            <Icons.Settings className="text-primary h-4 w-4" />
          </button>
        )}
      </div>

      {/* Config Panel */}
      {showConfig && CustomConfigComponent && (
        <div className="border-b border-primary/10 bg-[#0a0f18] px-3 py-2">
          <CustomConfigComponent />
        </div>
      )}

      {/* Tool Grid */}
      <div className="flex flex-col gap-1 p-2">
        <IconPresentationProvider
          size="small"
          IconContainer={ToolButton}
        >
          {toolboxSections.map(section => {
            const sectionId = section.componentProps.buttonSection;
            const buttons = toolbarService.getButtonSection(sectionId) as any[];

            return (
              <div
                key={sectionId}
                className="flex flex-wrap gap-2 rounded-xl bg-[#0d1320] p-2.5"
              >
                {buttons.map(tool => {
                  if (!tool || !tool.componentProps.visible) {
                    return null;
                  }
                  const { id, Component, componentProps } = tool;
                  const isActive = componentProps.isActive;

                  return (
                    <div
                      key={id}
                      className={[
                        'rounded-lg transition-all duration-200',
                        isActive
                          ? 'ring-1 ring-primary/60 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                          : '',
                      ].join(' ')}
                    >
                      <Component
                        {...componentProps}
                        id={id}
                        onInteraction={handleInteraction}
                        size="toolbox"
                        servicesManager={servicesManager}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </IconPresentationProvider>
      </div>

      {/* Active Tool Settings Drawer */}
      {activeToolOptions && (
        <div className="mx-2 mb-2 rounded-xl border border-primary/20 bg-[#0a0f18] px-3 py-2 shadow-[0_0_12px_rgba(45,212,191,0.08)]">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-primary/70">
              Active Tool Settings
            </span>
          </div>
          <ToolSettings options={activeToolOptions} />
        </div>
      )}
    </div>
  );
}
