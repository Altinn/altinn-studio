import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const RadioButtonIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate {...props}>
      <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='1.5' />
      <circle cx='12' cy='12' r='2.5' fill='currentColor' stroke='currentColor' strokeWidth='1.5' />
    </SvgTemplate>
  );
};
