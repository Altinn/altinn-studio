import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const NumberIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 10.4795 29.8148
        L 13.4646 5.81476
        L 16.4417 6.18505
        L 13.4566 30.1851
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 19.4355 29.8148
        L 22.4207 5.81476
        L 25.3978 6.18505
        L 22.4126 30.1851
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 6.13124 12.4091
        L 30.0117 12.5915
        L 29.989 15.5914
        L 6.10856 15.409
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 6.01112 20.4083
        L 29.8916 20.5906
        L 29.8689 23.5905
        L 5.98844 23.4082
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
