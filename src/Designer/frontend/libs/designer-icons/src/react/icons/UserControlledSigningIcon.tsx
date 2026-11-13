import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const UserControlledSigningIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.42212'
        y='4.26501'
        width='18'
        height='15.47'
        rx='2'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M12 16H18.7021'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
        strokeLinecap='round'
      />
      <path
        d='M13 13.0028L13.437 11.0363L17.1516 7.32168C17.5797 6.89353 18.2545 6.89201 18.6811 7.32169C19.1055 7.7492 19.1071 8.45928 18.6811 8.88526L14.9665 12.5998L13 13.0028Z'
        stroke='currentColor'
        strokeWidth='1.27393'
        strokeLinejoin='round'
      />
      <path
        d='M17.1165 7.39185L18.9174 9.19279'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
      />
      <path
        d='M6 16C6 12 12 12 12 16'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeMiterlimit='2.61533'
        strokeLinecap='round'
      />
      <circle cx='9' cy='9' r='2.25' stroke='currentColor' strokeWidth='1.5' />
    </SvgTemplate>
  );
};
