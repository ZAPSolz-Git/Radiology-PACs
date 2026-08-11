import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolWindowLevel({ className, style }: IconProps) {
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
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9" />
      {/* Left half filled to represent dark */}
      <path d="M12 3a9 9 0 0 0 0 18V3z" fill="currentColor" opacity="0.25" stroke="none" />
      {/* Horizontal midline */}
      <line x1="3" y1="12" x2="21" y2="12" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
