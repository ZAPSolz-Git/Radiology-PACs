import React from 'react';
import classNames from 'classnames';
import CircularProgress from '../CircularProgress';

function LoadingIndicatorProgress({ className, textBlock, progress }) {
  return (
    <div
      className={classNames(
        'absolute top-0 left-0 z-50 w-full h-full flex flex-col items-center justify-center space-y-5',
        'bg-[#060a10]/90 backdrop-blur-sm',
        className
      )}
    >
      <CircularProgress progress={progress} size={120} strokeWidth={4}>
        <img
          src="/assets/ArmorrayLogo.jpeg"
          alt="Armorray Logo"
          className="h-16 w-auto rounded-full border-2 border-primary/30 shadow-[0_0_20px_rgba(45,212,191,0.15)]"
        />
      </CircularProgress>
      {textBlock && (
        <div className="text-center">
          <div className="text-[13px] font-medium text-foreground/70">{textBlock}</div>
        </div>
      )}
    </div>
  );
}

export default LoadingIndicatorProgress;