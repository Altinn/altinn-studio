import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const StringIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 7.5 6
        V 15
        H 4.5
        V 6
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 25.5 6
        V 15
        H 22.5
        V 6
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 13.5 6
        V 15
        H 10.5
        V 6
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 31.5 6
        V 15
        H 28.5
        V 6
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
