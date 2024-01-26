import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const Accordion = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <path
        d='M8.44434 10.1797L11.9375 13.6797L15.5554 10.1797'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path d='M4 19H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M4 5H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </SvgTemplate>
  );
};
