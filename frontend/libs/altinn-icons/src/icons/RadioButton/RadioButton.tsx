import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { RadioButton } from '@altinn/icons';
 */
export const RadioButton = ({ title, ...rest }: IconProps): JSX.Element => {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...rest}
    >
      {title && <title>{title}</title>}
      <circle cx='12' cy='12' r='9' stroke='currentColor' strokeWidth='1.5' />
      <circle cx='12' cy='12' r='2.5' fill='currentColor' stroke='currentColor' strokeWidth='1.5' />
    </svg>
  );
};
