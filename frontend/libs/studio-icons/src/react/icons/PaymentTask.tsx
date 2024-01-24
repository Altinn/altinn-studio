import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const PaymentTask = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.23331'
        y='4.5311'
        width='18'
        height='15.47'
        rx='2'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <rect
        x='6.95331'
        y='8.32443'
        width='10.56'
        height='7.88333'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M7.35294 10.7776H17.3529'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
        strokeLinecap='round'
      />
      <circle cx='9.03253' cy='13.6208' r='0.75' fill='currentColor' />
      <circle cx='10.1702' cy='13.6208' r='0.75' fill='currentColor' />
    </SvgTemplate>
  );
};
