import React from 'react';
export type IconProps = React.SVGProps<SVGSVGElement>;

export const TabTools = (props: IconProps) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 22 22"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2L12 4.5L14.5 7L17 4.5L14.5 2Z" />
      <path d="M12 4.5C9.5 7 9.5 11 12 13.5L4 21.5L1.5 19L9.5 11" />
      <circle cx="17" cy="17" r="2" />
    </g>
  </svg>
);

export default TabTools;
