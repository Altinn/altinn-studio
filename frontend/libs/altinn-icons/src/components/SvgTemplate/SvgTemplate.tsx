import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {SvgTemplateProps} props the SvgTemplate props
 * @returns {JSX.Element} template for svg icons
 */

type SvgTemplateProps = IconProps & { children: React.ReactNode };
export const SvgTemplate = ({ title, children, ...rest }: SvgTemplateProps): JSX.Element => {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
};
