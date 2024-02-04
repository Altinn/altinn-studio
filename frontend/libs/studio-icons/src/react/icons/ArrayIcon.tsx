import { SvgTemplate } from './SvgTemplate';
import React from 'react';
import type { IconProps } from '../types';

export const ArrayIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 7.5 7.5
        H 12
        V 10.5
        H 10.5
        V 25.5
        H 12
        V 28.5
        H 7.5
        V 7.5
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 28.5 28.5
        H 24
        V 25.5
        H 25.5
        L 25.5 10.5
        H 24
        V 7.5
        H 28.5
        L 28.5 28.5
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
