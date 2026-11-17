import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const EFormidlingIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate {...props}>
      <g stroke='currentColor' strokeLinejoin='round'>
        <rect x='2.25' y='2.75' width='19.5' height='15.75' rx='1.3' strokeWidth='1.5' />
        <path d='M9 18.5V22M15 18.5V22M6.5 22H17.5' strokeWidth='1.5' />
        <path d='M7.5 8.25H12V6.25L17.5 10.75L12 15.25V13.25H5.5' strokeWidth='1.15' />
      </g>
    </SvgTemplate>
  );
};
