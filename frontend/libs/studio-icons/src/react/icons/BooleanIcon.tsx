import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const BooleanIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      d='
        M 18 6
        C 14.8174 6 11.7652 7.26428 9.51472 9.51472
        C 7.26428 11.7652 6 14.8174 6 18
        C 6 21.1826 7.26428 24.2348 9.51472 26.4853
        C 11.7652 28.7357 14.8174 30 18 30
        L 18 18
        L 18 6
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 27 18
        C 27 13.0294 22.9706 9 18 9
        C 13.0294 9 9 13.0294 9 18
        C 9 22.9706 13.0294 27 18 27
        C 22.9706 27 27 22.9706 27 18
        Z
        M 30 18
        C 30 11.3726 24.6274 6 18 6
        C 11.3726 6 6 11.3726 6 18
        C 6 24.6274 11.3726 30 18 30
        C 24.6274 30 30 24.6274 30 18
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
