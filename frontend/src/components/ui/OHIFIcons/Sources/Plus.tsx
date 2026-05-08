import React from 'react';
export type IconProps = React.SVGProps<SVGSVGElement>;

export const Plus = (props: IconProps) => (
  <svg
    width="21"
    height="21"
    viewBox="0 0 21 21"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      fill="none"
      fillRule="evenodd"
    >
      <path d="M0 0h21v21H0z" />
      <g
        stroke="#2DD4BF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      >
        <path d="M10.5 5.5v10M15.5 10.5h-10" />
      </g>
    </g>
  </svg>
);

export default Plus;
