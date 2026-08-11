import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolRect({ className, style }: IconProps) {
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
      {/* Main rectangle */}
      <rect x="4" y="7" width="16" height="10" rx="1.5" />
      {/* Corner indicators */}
      <circle cx="4" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="17" r="1.2" fill="currentColor" stroke="none" />
      {/* Center crosshair */}
      <line x1="12" y1="10.5" x2="12" y2="13.5" strokeWidth="1" />
      <line x1="10.5" y1="12" x2="13.5" y2="12" strokeWidth="1" />
    </svg>
  );
}
