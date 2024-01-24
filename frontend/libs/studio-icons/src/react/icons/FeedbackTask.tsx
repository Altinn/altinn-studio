import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const FeedbackTask = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.64441'
        y='4.5311'
        width='18'
        height='15.47'
        rx='2'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M16.9245 8.11652H8.36429C7.812 8.11652 7.36429 8.56423 7.36429 9.11651V17.2136C7.36429 17.3711 7.54359 17.4614 7.67009 17.3676L9.80619 15.7851C9.97844 15.6575 10.1871 15.5886 10.4015 15.5886L16.9245 15.5886C17.4768 15.5886 17.9245 15.1409 17.9245 14.5886V9.11652C17.9245 8.56423 17.4768 8.11652 16.9245 8.11652Z'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </SvgTemplate>
  );
};
