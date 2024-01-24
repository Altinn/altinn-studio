import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const Select = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.95972'
        y='6.90283'
        width='18'
        height='12'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M18.4597 12.5566H13.4597L15.9159 14.5566L18.4597 12.5566Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
    </SvgTemplate>
  );
};
