import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const DataTask = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.4111'
        y='4.53186'
        width='18'
        height='15.4684'
        rx='2'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <rect
        x='7.1311'
        y='6.96924'
        width='10.56'
        height='10.5937'
        rx='1'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M10.0316 12.2661H14.7905'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M10.0316 9.50235H14.7906'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M10.367 15.0298H13.9362'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </SvgTemplate>
  );
};
