import React from 'react';
import { SvgTemplate } from './SvgTemplate';
import type { IconProps } from '../types';

export const EndEventIcon = (props: IconProps): React.ReactElement => (
  <SvgTemplate viewBox='0 0 25 24' {...props}>
    <circle cx='12.6838' cy='12' r='7.5' stroke='#1E2B3C' strokeWidth='3' />
  </SvgTemplate>
);
