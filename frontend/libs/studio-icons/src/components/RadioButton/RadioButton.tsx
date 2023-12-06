import React from 'react';
import { IconProps } from '../../types/IconProps';
import { SvgTemplate } from '../SvgTemplate';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { RadioButton } from '@studio/icons';
 */
export const RadioButton = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='1.5' />
      <circle cx='12' cy='12' r='2.5' fill='currentColor' stroke='currentColor' strokeWidth='1.5' />
    </SvgTemplate>
  );
};
