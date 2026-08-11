import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@ohif/ui-next';
import { Icons } from '@ohif/ui-next';
import { actionIcon, viewPreset } from './types';

function PanelStudyBrowserHeader({
  viewPresets,
  updateViewPresetValue,
  actionIcons,
  updateActionIconValue,
}: {
  viewPresets: viewPreset[];
  updateViewPresetValue: (viewPreset: viewPreset) => void;
  actionIcons: actionIcon[];
  updateActionIconValue: (actionIcon: actionIcon) => void;
}) {
  // Button order: Settings button then List view mode (thumbnails vs. list)
  return (
    <>
      <div className="bg-[#0a0f18] border-b border-primary/10 flex h-[44px] select-none items-center p-2 shadow-lg">
        <div className={'flex h-[28px] w-full select-none justify-center self-center text-[13px]'}>
          <div className="flex w-full items-center gap-[12px]">
            <div className="flex items-center justify-center">
              <div className="text-primary flex items-center space-x-2">
                {actionIcons.map((icon: actionIcon, index) =>
                  React.createElement(Icons[icon.iconName] || Icons.MissingIcon, {
                    key: index,
                    onClick: () => updateActionIconValue(icon),
                    className: `cursor-pointer bg-primary/5 p-1.5 rounded-lg hover:bg-primary/15 transition-all duration-200 hover:scale-110 active:scale-95`,
                  })
                )}
              </div>
            </div>
            <div className="ml-auto flex h-full items-center justify-center">
              <div className="bg-black/30 border border-primary/15 flex items-center rounded-lg p-0.5">
                <ToggleGroup
                  type="single"
                  value={viewPresets.filter(preset => preset.selected)[0].id}
                  onValueChange={value => {
                    const selectedViewPreset = viewPresets.find(preset => preset.id === value);
                    updateViewPresetValue(selectedViewPreset);
                  }}
                >
                  {viewPresets.map((viewPreset: viewPreset, index) => (
                    <ToggleGroupItem
                      key={index}
                      aria-label={viewPreset.id}
                      value={viewPreset.id}
                      className="text-primary data-[state=on]:bg-primary data-[state=on]:text-background h-7 w-7 rounded-md transition-all duration-200"
                    >
                      {React.createElement(Icons[viewPreset.iconName] || Icons.MissingIcon, {
                        className: 'h-4 w-4'
                      })}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export { PanelStudyBrowserHeader };
