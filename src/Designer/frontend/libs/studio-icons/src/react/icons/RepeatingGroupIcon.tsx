import * as React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';
export const RepeatingGroupIcon = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        width={12}
        height={12}
        x={3}
        y={3}
        stroke='#1E2B3C'
        strokeDasharray='2.25 2.25'
        strokeWidth={1.5}
        rx={2.25}
      />
      <rect
        width={12}
        height={12}
        x={9}
        y={9}
        stroke='#1E2B3C'
        strokeDasharray='2.25 2.25'
        strokeWidth={1.5}
        rx={2.25}
      />
    </SvgTemplate>
  );
};
