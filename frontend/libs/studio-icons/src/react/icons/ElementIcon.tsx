import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const ElementIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      d='
        M 6 12
        H 15
        V 21
        H 24
        V 30
        H 6
        Z
      '
      fill='currentColor'
    />
    <path
      d='
        M 21 6
        H 30
        V 15
        H 21
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
