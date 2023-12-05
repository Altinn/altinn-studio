import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import { IconProps } from '../types';

export const Property = (props: IconProps): JSX.Element => (
  <SvgTemplate viewBox='0 0 36 36' {...props}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 30 10.5
        H 12
        V 7.5
        H 30
        Z
      '
      fill='#0062BA'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 30 19.5
        H 12
        V 16.5
        H 30
        Z
      '
      fill='#0062BA'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 30 28.5
        H 12
        V 25.5
        H 30
        Z
      '
      fill='#0062BA'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 9 10.5
        H 6
        V 7.5
        H 9
        Z
      '
      fill='#0062BA'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 9 19.5
        H 6
        V 16.5
        H 9
        Z
      '
      fill='#0062BA'
    />
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='
        M 9 28.5
        H 6
        V 25.5
        H 9
        Z
      '
      fill='#0062BA'
    />
  </SvgTemplate>
);
