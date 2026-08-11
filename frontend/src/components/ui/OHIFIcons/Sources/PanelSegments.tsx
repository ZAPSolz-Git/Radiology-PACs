import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function PanelSegments({ className, style }: IconProps) {
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
      {/* Top-right arc (segment 1) */}
      <path d="M12 3 A9 9 0 0 1 21 12" opacity="0.5" />
      {/* Bottom-right arc (segment 2) */}
      <path d="M21 12 A9 9 0 0 1 12 21" />
      {/* Bottom-left arc (segment 3) */}
      <path d="M12 21 A9 9 0 0 1 3 12" opacity="0.7" />
      {/* Top-left arc (segment 4) */}
      <path d="M3 12 A9 9 0 0 1 12 3" opacity="0.35" />
      {/* Center hub */}
      <circle cx="12" cy="12" r="2.5" />
      {/* Spokes */}
      <line x1="12" y1="9.5" x2="12" y2="3" strokeWidth="1" />
      <line x1="14.5" y1="12" x2="21" y2="12" strokeWidth="1" />
      <line x1="12" y1="14.5" x2="12" y2="21" strokeWidth="1" />
      <line x1="9.5" y1="12" x2="3" y2="12" strokeWidth="1" />
    </svg>
  );
}
