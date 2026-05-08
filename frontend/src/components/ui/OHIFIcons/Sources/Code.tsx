import React from 'react';
import { Code as LucideCode, LucideProps } from 'lucide-react';
export type IconProps = React.SVGProps<SVGSVGElement>;

export const Code = (props: LucideProps) => <LucideCode {...props} />;

export default Code;
