import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolLength({ className, style }: IconProps) {
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
      {/* Main measurement line */}
      <line x1="4" y1="12" x2="20" y2="12" />
      {/* Left endpoint cap */}
      <line x1="4" y1="9" x2="4" y2="15" />
      {/* Right endpoint cap */}
      <line x1="20" y1="9" x2="20" y2="15" />
      {/* Endpoint dots */}
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="none" />
      {/* Ruler ticks */}
      <line x1="9" y1="12" x2="9" y2="14" />
      <line x1="12" y1="12" x2="12" y2="14.5" />
      <line x1="15" y1="12" x2="15" y2="14" />
    </svg>
  );
}
