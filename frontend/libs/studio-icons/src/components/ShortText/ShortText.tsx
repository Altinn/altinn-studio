import React from 'react';
import { IconProps } from '../../types/IconProps';
import { SvgTemplate } from '../SvgTemplate';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { ShortText } from '@studio/icons';
 */
export const ShortText = ({ ...props }: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3'
        y='6.83301'
        width='18'
        height='12'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path d='M6 10.0771H18' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path
        d='M6.00098 13.0771H12.001'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </SvgTemplate>
  );
};
