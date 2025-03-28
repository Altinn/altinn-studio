import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const NavigationPageIcon = (props: IconProps): React.ReactElement => (
  <SvgTemplate viewBox='0 0 24 24' {...props}>
    <path
      d='M12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23Z'
      fill='white'
    />
    <path
      d='M12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23Z'
      stroke='#3582C8'
      strokeWidth='2'
    />
  </SvgTemplate>
);
