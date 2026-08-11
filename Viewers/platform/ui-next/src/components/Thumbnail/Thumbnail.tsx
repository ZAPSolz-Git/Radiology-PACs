import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useDrag } from 'react-dnd';
import { Icons } from '../Icons';
import { DisplaySetMessageListTooltip } from '../DisplaySetMessageListTooltip';
import { TooltipTrigger, TooltipContent, Tooltip } from '../Tooltip';

/**
 * Display a thumbnail for a display set.
 */
const Thumbnail = ({
  displaySetInstanceUID,
  className,
  imageSrc,
  imageAltText,
  description,
  seriesNumber,
  numInstances,
  loadingProgress,
  countIcon,
  messages,
  isActive,
  onClick,
  onDoubleClick,
  thumbnailType,
  modality,
  viewPreset = 'thumbnails',
  isHydratedForDerivedDisplaySet = false,
  isTracked = false,
  canReject = false,
  dragData = {},
  onReject = () => {},
  onClickUntrack = () => {},
  ThumbnailMenuItems = () => {},
}: withAppTypes): React.ReactNode => {
  // TODO: We should wrap our thumbnail to create a "DraggableThumbnail", as
  // this will still allow for "drag", even if there is no drop target for the
  // specified item.
  const [collectedProps, drag, dragPreview] = useDrag({
    type: 'displayset',
    item: { ...dragData },
    canDrag: function (monitor) {
      return Object.keys(dragData).length !== 0;
    },
  });

  const [lastTap, setLastTap] = useState(0);

  const handleTouchEnd = e => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      onDoubleClick(e);
    } else {
      onClick(e);
    }
    setLastTap(currentTime);
  };

  const renderThumbnailPreset = () => {
    return (
      <div
        className={classnames(
          'flex h-full w-full flex-col items-center justify-center gap-[4px] p-[6px] transition-all duration-200',
          isActive && 'bg-primary/5 rounded-xl'
        )}
      >
        <div className="h-[114px] w-[128px]">
          <div className="relative bg-[#000000] rounded-lg overflow-hidden ring-1 ring-white/5">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={imageAltText}
                className="h-[114px] w-[128px] object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="bg-[#0a0f18] h-[114px] w-[128px]"></div>
            )}

            {/* bottom left */}
            <div className="absolute bottom-0 left-0 flex h-[14px] items-center gap-[4px] rounded-tr bg-black/40 backdrop-blur-sm pt-[10px] pb-[10px] pr-[8px] pl-[6px]">
              <div
                className={classnames(
                  'h-[8px] w-[8px] rounded-full shadow-[0_0_8px_rgba(45,212,191,0.5)]',
                  isActive || isHydratedForDerivedDisplaySet ? 'bg-primary' : 'bg-primary/40',
                  loadingProgress && loadingProgress < 1 && 'bg-primary/10'
                )}
              ></div>
              <div
                className="text-[10px] font-bold text-primary tracking-wider"
                data-cy="series-modality-label"
              >
                {modality}
              </div>
            </div>

            {/* top right */}
            <div className="absolute top-0 right-0 flex items-center gap-[4px]">
              <DisplaySetMessageListTooltip
                messages={messages}
                id={`display-set-tooltip-${displaySetInstanceUID}`}
              />
              {isTracked && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="group/track bg-black/40 backdrop-blur-sm rounded-full p-1 border border-white/5">
                      <Icons.StatusTracking className="text-primary h-[14px] w-[14px] group-hover/track:hidden" />
                      <Icons.Cancel
                        className="text-destructive hidden h-[14px] w-[14px] group-hover/track:block"
                        onClick={onClickUntrack}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-1 flex-row">
                      <div className="flex-2 flex items-center justify-center pr-4">
                        <Icons.InfoLink className="text-primary" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span>
                          <span className="text-white">
                            {isTracked ? 'Series is tracked' : 'Series is untracked'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {/* bottom right */}
            <div className="absolute bottom-0 right-0 flex items-center gap-[4px] p-[4px]">
              <ThumbnailMenuItems
                displaySetInstanceUID={displaySetInstanceUID}
                canReject={canReject}
                onReject={onReject}
              />
            </div>
          </div>
        </div>
        <div className="flex h-[52px] w-[128px] flex-col justify-start pt-1 px-1">
          <Tooltip>
            <TooltipContent>{description}</TooltipContent>
            <TooltipTrigger>
              <div
                className="min-h-[18px] w-[128px] overflow-hidden text-ellipsis whitespace-nowrap pb-0.5 text-left text-[11px] font-medium leading-4 text-foreground/80"
                data-cy="series-description-label"
              >
                {description}
              </div>
            </TooltipTrigger>
          </Tooltip>
          <div className="flex h-[12px] items-center gap-[7px] overflow-hidden mt-0.5">
            <div className="text-white/40 text-[10px] font-medium tracking-tight"> S:{seriesNumber}</div>
            <div className="text-white/40 text-[10px] font-medium">
              <div className="flex items-center gap-[3px]">
                {countIcon ? (
                  React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'w-2.5 opacity-60' })
                ) : (
                  <Icons.InfoSeries className="w-2.5 opacity-60" />
                )}
                <div>{numInstances}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderListPreset = () => {
    return (
      <div
        className={classnames(
          'flex h-full w-full items-center justify-between pr-[8px] pl-[8px] pt-[4px] pb-[4px]',
          isActive && 'bg-popover rounded'
        )}
      >
        <div className="relative flex h-[36px] w-full items-center gap-[10px] overflow-hidden">
          <div
            className={classnames(
              'h-[32px] w-[3px] min-w-[3px] rounded-full transition-colors duration-300',
              isActive || isHydratedForDerivedDisplaySet ? 'bg-primary shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'bg-primary/30',
              loadingProgress && loadingProgress < 1 && 'bg-primary/10'
            )}
          ></div>
          <div className="flex h-full w-[calc(100%-12px)] flex-col justify-start">
            <div className="flex items-center gap-[8px]">
              <div
                className="text-[12px] font-bold text-primary tracking-wide"
                data-cy="series-modality-label"
              >
                {modality}
              </div>
              <Tooltip>
                <TooltipContent>{description}</TooltipContent>
                <TooltipTrigger className="w-full overflow-hidden">
                  <div
                    className="max-w-[160px] overflow-hidden overflow-ellipsis whitespace-nowrap text-left text-[12px] font-medium text-foreground/90"
                    data-cy="series-description-label"
                  >
                    {description}
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </div>

            <div className="flex h-[12px] items-center gap-[8px] overflow-hidden">
              <div className="text-white/40 text-[11px] font-medium"> S:{seriesNumber}</div>
              <div className="text-white/40 text-[11px] font-medium">
                <div className="flex items-center gap-[4px]">
                  {' '}
                  {countIcon ? (
                    React.createElement(Icons[countIcon] || Icons.MissingIcon, { className: 'w-3 opacity-60' })
                  ) : (
                    <Icons.InfoSeries className="w-3 opacity-60" />
                  )}
                  <div>{numInstances}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-full items-center gap-[4px]">
          <DisplaySetMessageListTooltip
            messages={messages}
            id={`display-set-tooltip-${displaySetInstanceUID}`}
          />
          {isTracked && (
            <Tooltip>
              <TooltipTrigger>
                <div className="group/track bg-primary/10 rounded-full p-1.5 transition-colors">
                  <Icons.StatusTracking className="text-primary h-[14px] w-[14px] group-hover/track:hidden" />
                  <Icons.Cancel
                    className="text-destructive hidden h-[14px] w-[14px] group-hover/track:block"
                    onClick={onClickUntrack}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-1 flex-row">
                  <div className="flex-2 flex items-center justify-center pr-4">
                    <Icons.InfoLink className="text-primary" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span>
                      <span className="text-white">
                        {isTracked ? 'Series is tracked' : 'Series is untracked'}
                      </span>
                    </span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <ThumbnailMenuItems
            displaySetInstanceUID={displaySetInstanceUID}
            canReject={canReject}
            onReject={onReject}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={classnames(
        className,
        'group flex cursor-pointer select-none flex-col rounded-xl outline-none transition-all duration-300 border border-transparent',
        'bg-[#0d1320] hover:bg-primary/10 hover:border-primary/30 hover:shadow-[0_0_14px_rgba(45,212,191,0.12)]',
        isActive && 'border-primary/50 bg-primary/5 shadow-[0_0_16px_rgba(45,212,191,0.15)] hover:bg-primary/10',
        viewPreset === 'thumbnails' && 'h-[178px] w-[138px]',
        viewPreset === 'list' && 'h-[44px] w-full px-1'
      )}
      id={`thumbnail-${displaySetInstanceUID}`}
      data-cy={
        thumbnailType === 'thumbnailNoImage'
          ? 'study-browser-thumbnail-no-image'
          : 'study-browser-thumbnail'
      }
      data-series={seriesNumber}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onTouchEnd={handleTouchEnd}
      role="button"
    >
      <div
        ref={drag}
        className="h-full w-full"
      >
        {viewPreset === 'thumbnails' && renderThumbnailPreset()}
        {viewPreset === 'list' && renderListPreset()}
      </div>
    </div>
  );
};

Thumbnail.propTypes = {
  displaySetInstanceUID: PropTypes.string.isRequired,
  className: PropTypes.string,
  imageSrc: PropTypes.string,
  /**
   * Data the thumbnail should expose to a receiving drop target. Use a matching
   * `dragData.type` to identify which targets can receive this draggable item.
   * If this is not set, drag-n-drop will be disabled for this thumbnail.
   *
   * Ref: https://react-dnd.github.io/react-dnd/docs/api/use-drag#specification-object-members
   */
  dragData: PropTypes.shape({
    /** Must match the "type" a dropTarget expects */
    type: PropTypes.string.isRequired,
  }),
  imageAltText: PropTypes.string,
  description: PropTypes.string.isRequired,
  seriesNumber: PropTypes.any,
  numInstances: PropTypes.number.isRequired,
  loadingProgress: PropTypes.number,
  messages: PropTypes.object,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  onDoubleClick: PropTypes.func.isRequired,
  viewPreset: PropTypes.string,
  modality: PropTypes.string,
  isHydratedForDerivedDisplaySet: PropTypes.bool,
  isTracked: PropTypes.bool,
  onClickUntrack: PropTypes.func,
  countIcon: PropTypes.string,
  thumbnailType: PropTypes.oneOf(['thumbnail', 'thumbnailTracked', 'thumbnailNoImage']),
};

export { Thumbnail };
