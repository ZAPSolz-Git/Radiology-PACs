import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolScrollStack({ className, style }: IconProps) {
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
      {/* Bottom slice */}
      <rect x="5" y="15" width="14" height="3" rx="1" opacity="0.4" />
      {/* Middle slice */}
      <rect x="5" y="10.5" width="14" height="3" rx="1" opacity="0.7" />
      {/* Top slice (active) */}
      <rect x="5" y="6" width="14" height="3" rx="1" />
      {/* Scroll arrow */}
      <polyline points="17,2 20,5 17,8" strokeWidth="1.5" />
      <line x1="20" y1="5" x2="16" y2="5" />
    </svg>
  );
}
