import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

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
