import React from 'react';
import { useToolbar } from '@ohif/core';

/**
 * Props for the Toolbar component that renders a collection of toolbar buttons and/or button sections.
 *
 * @interface ToolbarProps
 */
interface ToolbarProps {
  /**
   * The section of buttons to display in the toolbar.
   * Common values include 'primary', 'secondary', 'tertiary', etc.
   * Defaults to 'primary' if not specified.
   *
   * @default 'primary'
   */
  buttonSection?: string;

  /**
   * The unique identifier of the viewport this toolbar is associated with.
   */
  viewportId?: string;

  /**
   * The numeric position or location of the toolbar.
   * Used for ordering and layout purposes in the UI.
   */
  location?: number;
}

export function Toolbar({ buttonSection = 'primary', viewportId, location }: ToolbarProps) {
  const {
    toolbarButtons,
    onInteraction,
    isItemOpen,
    isItemLocked,
    openItem,
    closeItem,
    toggleLock,
  } = useToolbar({
    buttonSection,
  });

  if (!toolbarButtons.length) {
    return null;
  }

  // Filter tools if accessed via a share link with restrictions
  let filteredButtons = toolbarButtons;
  try {
    const shareRole = window.sessionStorage.getItem('shareRole');
    const allowedToolsStr = window.sessionStorage.getItem('shareAllowedTools');

    // If a share role exists, and allowed tools are specifically configured for it
    if (shareRole && allowedToolsStr) {
      const allowedTools = JSON.parse(allowedToolsStr);
      // Empty array in our backend logic for 'user' role means view-only, meaning we restrict tools.
      // Wait, 'user' allowedTools is [] by default.
      // If allowedTools is empty array, it historically means "all tools" for most roles except 'user'.
      // But based on the PR discussion, for sharing purposes we should strictly use allowedTools as a whitelist.
      // E.g. user -> [] means no tools. radiologist -> [] means all tools (for backward compatibility).
      // Let's filter if shareRole is 'user'.
      if (shareRole === 'user' || allowedTools.length > 0) {
        filteredButtons = toolbarButtons.filter(btn => {
          if (!btn) return false;
          // Always allow essential navigational tools (like More, Layout, WindowLevel), or strict filtering?
          // Since the prompt asks to restrict "measurement tools, report editor", we can just do a whitelist.
          // By default, if it's 'user' and allowedTools is [], we only allow safe tools.
          if (allowedTools.length === 0 && shareRole === 'user') {
            const safeTools = ['Zoom', 'Pan', 'Reset'];
            return safeTools.includes(btn.id);
          }
          return allowedTools.includes(btn.id);
        });
      }
    }
  } catch (err) {
    console.warn('[Toolbar] Failed to apply tool restrictions:', err);
  }

  return (
    <>
      {filteredButtons?.map(toolDef => {
        if (!toolDef) {
          return null;
        }

        const { id, Component, componentProps } = toolDef;

        // Enhanced props with state and actions - respecting viewport specificity
        const enhancedProps = {
          ...componentProps,
          isOpen: isItemOpen(id, viewportId),
          isLocked: isItemLocked(id, viewportId),
          onOpen: () => openItem(id, viewportId),
          onClose: () => closeItem(id, viewportId),
          onToggleLock: () => toggleLock(id, viewportId),
          viewportId,
        };

        const tool = (
          <Component
            key={id}
            id={id}
            location={location}
            onInteraction={args => {
              onInteraction({
                ...args,
                itemId: id,
                viewportId,
              });
            }}
            {...enhancedProps}
          />
        );

        return (
          <div
            key={id}
            // This wrapper div exists solely for React's key prop requirement during reconciliation.
            // We use display:contents to make it transparent to the layout engine (children appear
            // as direct children of the parent) while keeping it in the DOM for React's virtual DOM.
            className="contents"
          >
            {tool}
          </div>
        );
      })}
    </>
  );
}
