import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function PanelMeasurements({ className, style }: IconProps) {
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
      {/* List lines */}
      <line x1="9" y1="7" x2="20" y2="7" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="17" x2="20" y2="17" />
      {/* Ruler left bar */}
      <line x1="4" y1="5" x2="4" y2="19" strokeWidth="2" />
      {/* Ruler ticks */}
      <line x1="4" y1="7" x2="7" y2="7" />
      <line x1="4" y1="12" x2="7" y2="12" />
      <line x1="4" y1="17" x2="7" y2="17" />
    </svg>
  );
}
