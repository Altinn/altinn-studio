import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const NumberIcon = (props: IconProps): React.ReactElement => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fill='currentColor'
      fillRule='evenodd'
      clipRule='evenodd'
      d='M15.5 12a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0m0 12a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0M10 17.5a1.5 1.5 0 0 0 0 3h16a1.5 1.5 0 0 0 0-3z'
    />
  </SvgTemplate>
);
