import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const SignTask = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.8222'
        y='4.5311'
        width='18'
        height='15.47'
        rx='2'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M7.54221 17.6227H18.1022'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
        strokeLinecap='round'
      />
      <path
        d='M9.00428 15.4174L9.56043 12.9147L14.2877 8.1874C14.8326 7.64252 15.6913 7.64058 16.2343 8.18742C16.7744 8.73148 16.7764 9.63516 16.2343 10.1773L11.507 14.9046L9.00428 15.4174Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <path
        d='M13.4535 8.20169L15.4 10.1482'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
      />
    </SvgTemplate>
  );
};
