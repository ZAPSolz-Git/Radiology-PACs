import React from 'react';
export type IconProps = React.SVGProps<SVGSVGElement>;

export const OHIFLogoColorDarkBackground = (props: IconProps) => (
  <img
    src="/assets/ArmorrayLogo.jpeg"
    alt="Armorray Logo"
    {...props}
  />
);

export default OHIFLogoColorDarkBackground;
