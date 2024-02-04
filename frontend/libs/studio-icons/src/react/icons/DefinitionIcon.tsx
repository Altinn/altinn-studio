import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const DefinitionIcon = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 4.5 4.5
        H 10.5
        V 31.5
        H 4.5
        Z
        M 7.5 25.5
        C 8.32843 25.5 9 26.1716 9 27
        V 28.5
        C 9 29.3284 8.32843 30 7.5 30
        C 6.67157 30 6 29.3284 6 28.5
        V 27
        C 6 26.1716 6.67157 25.5 7.5 25.5
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 15 10.5
        H 21
        V 31.5
        H 15
        Z
        M 18 25.5
        C 18.8284 25.5 19.5 26.1716 19.5 27
        V 28.5
        C 19.5 29.3284 18.8284 30 18 30
        C 17.1716 30 16.5 29.3284 16.5 28.5
        V 27
        C 16.5 26.1716 17.1716 25.5 18 25.5
        Z
      '
      fill='currentColor'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 25.5 7.5
        H 31.5
        V 31.5
        H 25.5
        Z
        M 28.5 25.5
        C 29.3284 25.5 30 26.1716 30 27
        V 28.5
        C 30 29.3284 29.3284 30 28.5 30
        C 27.6716 30 27 29.3284 27 28.5
        V 27
        C 27 26.1716 27.6716 25.5 28.5 25.5
        Z
      '
      fill='currentColor'
    />
  </SvgTemplate>
);
