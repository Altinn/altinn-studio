import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const Title = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <path d='M4 15.8467H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path
        d='M4.00098 19.6934H12.001'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.00171 5.69336H10.0017'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M7.00171 6.05322L7.00171 12.0532'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </SvgTemplate>
  );
};
