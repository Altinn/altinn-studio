import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const PaymentDetailsIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate {...props}>
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M5.54839 3.75V20.25H6.53626C6.96383 20.25 7.31045 20.5858 7.31045 21C7.31045 21.4142 6.96383 21.75 6.53626 21.75H5.29032C4.5777 21.75 4 21.1904 4 20.5V3.5C4 2.80964 4.5777 2.25 5.29032 2.25H18.7097C19.4223 2.25 20 2.80964 20 3.5V11.0761C20 11.4903 19.6534 11.8261 19.2258 11.8261C18.7982 11.8261 18.4516 11.4903 18.4516 11.0761V3.75H5.54839Z'
        fill='#1E2B3C'
      />
      <path d='M8.13232 6.6156H14.6323' stroke='#1E2B3C' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M8.31836 9.82996H12.8184' stroke='#1E2B3C' strokeWidth='1.5' strokeLinecap='round' />
      <rect
        x='8.93881'
        y='13.1721'
        width='10.3168'
        height='7.81836'
        rx='1'
        stroke='#1E2B3C'
        strokeWidth='1.5'
      />
      <path
        d='M8.93881 15.5641L18.5684 15.5641'
        stroke='#1E2B3C'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
        strokeLinecap='round'
      />
      <circle cx='10.8135' cy='17.8779' r='0.75' fill='#1E2B3C' />
      <circle cx='11.9512' cy='17.8779' r='0.75' fill='#1E2B3C' />
    </SvgTemplate>
  );
};
