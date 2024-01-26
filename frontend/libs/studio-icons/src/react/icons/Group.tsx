import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const Group = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='4.42725'
        y='4.90283'
        width='16'
        height='16'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeDasharray='3 3'
      />
    </SvgTemplate>
  );
};
