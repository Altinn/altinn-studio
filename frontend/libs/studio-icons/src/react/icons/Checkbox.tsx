import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const Checkbox = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect x='4' y='4' width='16' height='16' rx='3' stroke='currentColor' strokeWidth='1.5' />
      <path
        d='M8.39258 11.1729L11.2534 14.177'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M15.6074 9.82324L11.2535 14.1772'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </SvgTemplate>
  );
};
