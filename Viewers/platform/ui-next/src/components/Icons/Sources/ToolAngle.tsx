import React from 'react';
type IconProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function ToolAngle({ className, style }: IconProps) {
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
      {/* First arm (horizontal) */}
      <line x1="4" y1="18" x2="20" y2="18" />
      {/* Second arm (angled) */}
      <line x1="4" y1="18" x2="14" y2="6" />
      {/* Angle arc */}
      <path d="M9 18 A6 6 0 0 1 7.5 13.5" />
      {/* Vertex dot */}
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
      {/* Endpoint dots */}
      <circle cx="20" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
