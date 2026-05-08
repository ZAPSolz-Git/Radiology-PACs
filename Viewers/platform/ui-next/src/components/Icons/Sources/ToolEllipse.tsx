import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolEllipse({ className, style }: IconProps) {
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
      {/* Ellipse */}
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      {/* Center crosshair */}
      <line x1="12" y1="10" x2="12" y2="14" strokeWidth="1" />
      <line x1="10" y1="12" x2="14" y2="12" strokeWidth="1" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      {/* Dashed measurement lines */}
      <line x1="3" y1="12" x2="5" y2="12" strokeDasharray="1.5 1" />
      <line x1="19" y1="12" x2="21" y2="12" strokeDasharray="1.5 1" />
    </svg>
  );
}
