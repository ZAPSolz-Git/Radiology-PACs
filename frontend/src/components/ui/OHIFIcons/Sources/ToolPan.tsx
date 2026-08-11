import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolPan({ className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Up arrow */}
      <polyline points="12,3 9,6 15,6" />
      <line x1="12" y1="3" x2="12" y2="8" />
      {/* Down arrow */}
      <polyline points="12,21 9,18 15,18" />
      <line x1="12" y1="21" x2="12" y2="16" />
      {/* Left arrow */}
      <polyline points="3,12 6,9 6,15" />
      <line x1="3" y1="12" x2="8" y2="12" />
      {/* Right arrow */}
      <polyline points="21,12 18,9 18,15" />
      <line x1="21" y1="12" x2="16" y2="12" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
