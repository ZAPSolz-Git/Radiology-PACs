import React from 'react';

const CircularProgress = ({ progress, size = 100, strokeWidth = 8, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset =
    progress !== undefined ? circumference - (progress / 100) * circumference : 0;
  const isIndeterminate = progress === undefined;

  return (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{ width: size, height: size }}
    >
      <svg
        className={`absolute -rotate-90 ${isIndeterminate ? 'animate-spin' : ''}`}
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        {/* Background track circle */}
        <circle
          stroke="rgba(45, 212, 191, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Glow behind progress arc */}
        <circle
          stroke="rgba(45, 212, 191, 0.25)"
          strokeWidth={strokeWidth + 4}
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ filter: 'blur(4px)' }}
        />
        {/* Progress circle */}
        <circle
          stroke="#2DD4BF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className={!isIndeterminate ? 'transition-all duration-300 ease-in-out' : ''}
        />
      </svg>

      {/* Centered children */}
      <div className="flex items-center justify-center overflow-visible">
        {children}
      </div>
    </div>
  );
};

export default CircularProgress;