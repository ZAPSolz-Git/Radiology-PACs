import React from 'react';
import classnames from 'classnames';

import { PanelSection } from '../../components';
import { ToolSettings } from '../OHIFToolSettings';

const ItemsPerRow = 4;

interface ToolbarButton {
  id: string;
  Component: React.ComponentType<{
    id: string;
    onInteraction: (details: { itemId: string }) => void;
    size: string;
  }>;
  componentProps: {
    isActive?: boolean;
    buttonSection?: string;
    options?: unknown;
  };
}

interface ToolboxProps {
  toolbarButtons: ToolbarButton[];
  numRows: number;
  title?: string;
  useCollapsedPanel?: boolean;
  onInteraction?: (details: { itemId: string }) => void;
  activeToolOptions?: unknown;
}

function ToolboxUI(props: ToolboxProps) {
  const {
    toolbarButtons = [],
    numRows,
    title,
    useCollapsedPanel = true,
    onInteraction,
    activeToolOptions,
  } = props;

  const render = () => {
    return (
      <div className="flex flex-col bg-[#060a10]">
        <div className="flex flex-wrap gap-2 p-2.5">
          {toolbarButtons.map((toolDef, index) => {
            if (!toolDef) {
              return null;
            }

            const { id, Component, componentProps } = toolDef;
            const isActive = componentProps?.isActive;

            return (
              <div
                key={id}
                className={classnames(
                  'rounded-lg transition-all duration-200',
                  isActive
                    ? 'ring-1 ring-primary/60 shadow-[0_0_10px_rgba(45,212,191,0.2)] bg-primary/10'
                    : 'bg-[#0d1320] hover:bg-[#1a2332]'
                )}
              >
                <Component
                  {...componentProps}
                  id={id}
                  onInteraction={({ itemId }) => onInteraction?.({ itemId })}
                  size="toolbox"
                />
              </div>
            );
          })}
        </div>
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
  };

  return (
    <>
      {useCollapsedPanel ? (
        <PanelSection className="bg-[#060a10] border-none">
          <PanelSection.Header className="bg-[#0a0f18] border-b border-primary/10 h-[44px]">
            <div className="flex items-center gap-2">
              <div className="h-4 w-0.5 rounded-full bg-primary shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
              <span className="text-[13px] font-semibold tracking-wide text-foreground/90">
                {title}
              </span>
            </div>
          </PanelSection.Header>
          <PanelSection.Content className="flex-shrink-0 border-none p-0">{render()}</PanelSection.Content>
        </PanelSection>
      ) : (
        render()
      )}
    </>
  );
}

export { ToolboxUI };
