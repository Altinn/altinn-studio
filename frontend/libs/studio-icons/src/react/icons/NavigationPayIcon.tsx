import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const NavigationPayIcon = (props: IconProps): React.ReactElement => (
  <SvgTemplate viewBox='0 0 28 28' {...props}>
    <mask id='path-1-inside-1_17363_23963' fill='white'>
      <path d='M0 4C0 1.79086 1.79086 0 4 0H24C26.2091 0 28 1.79086 28 4V24C28 26.2091 26.2091 28 24 28H4C1.79086 28 0 26.2091 0 24V4Z' />
    </mask>
    <path
      d='M0 4C0 1.79086 1.79086 0 4 0H24C26.2091 0 28 1.79086 28 4V24C28 26.2091 26.2091 28 24 28H4C1.79086 28 0 26.2091 0 24V4Z'
      fill='white'
    />
    <path
      d='M4 2H24V-2H4V2ZM26 4V24H30V4H26ZM24 26H4V30H24V26ZM2 24V4H-2V24H2ZM4 26C2.89543 26 2 25.1046 2 24H-2C-2 27.3137 0.686291 30 4 30V26ZM26 24C26 25.1046 25.1046 26 24 26V30C27.3137 30 30 27.3137 30 24H26ZM24 2C25.1046 2 26 2.89543 26 4H30C30 0.686292 27.3137 -2 24 -2V2ZM4 -2C0.686292 -2 -2 0.686291 -2 4H2C2 2.89543 2.89543 2 4 2V-2Z'
      fill='#777F89'
      mask='url(#path-1-inside-1_17363_23963)'
    />
    <rect x='5' y='7.04883' width='18' height='13.9035' rx='1' stroke='#59626F' strokeWidth='1.5' />
    <rect
      x='5'
      y='10.0898'
      width='18'
      height='2.28989'
      fill='#59626F'
      stroke='#59626F'
      strokeWidth='1.5'
    />
    <ellipse
      cx='8.35547'
      cy='17.3672'
      rx='0.5'
      ry='0.509815'
      fill='#59626F'
      stroke='#59626F'
      strokeWidth='1.5'
    />
    <ellipse
      cx='9.85156'
      cy='17.3672'
      rx='0.5'
      ry='0.509815'
      fill='#59626F'
      stroke='#59626F'
      strokeWidth='1.5'
    />
  </SvgTemplate>
);
