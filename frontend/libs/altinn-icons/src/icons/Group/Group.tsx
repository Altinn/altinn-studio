import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Group } from '@altinn/icons';
 */
export const Group = ({ title, ...rest }: IconProps): JSX.Element => {
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
      <rect
        x='4.42725'
        y='4.90283'
        width='16'
        height='16'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeDasharray='3 3'
      />
    </svg>
  );
};
