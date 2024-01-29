import React from 'react';
import type { IconProps } from '../types';

type SvgTemplateProps = IconProps & { children: React.ReactNode };
export const SvgTemplate = ({ title, children, ...rest }: SvgTemplateProps): JSX.Element => {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      role='img'
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
};
