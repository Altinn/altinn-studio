import { SvgTemplate } from './SvgTemplate';
import React from 'react';
import type { IconProps } from '../types';

export const CombinationIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 6 6
        H 9
        V 8.66667
        H 8.66667
        V 9
        H 6
        Z
        M 6 27
        V 30
        H 9
        V 27.3333
        H 8.66667
        V 27
        Z
        M 27 30
        H 30
        V 27
        H 27.3333
        V 27.3333
        H 27
        Z
        M 30 9
        V 6
        H 27
        V 8.66667
        H 27.3333
        V 9
        Z
        M 11.3333 6
        V 9
        H 16.6667
        V 6
        Z
        M 19.3333 6
        V 9
        H 24.6667
        V 6
        Z
        M 30 11.3333
        H 27
        V 16.6667
        H 30
        Z
        M 30 19.3333
        H 27
        V 24.6667
        H 30
        Z
        M 24.6667 30
        V 27
        H 19.3333
        V 30
        Z
        M 16.6667 30
        V 27
        H 11.3333
        V 30
        Z
        M 6 24.6667
        H 9
        V 19.3333
        H 6
        Z
        M 6 16.6667
        H 9
        V 11.3333
        H 6
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
