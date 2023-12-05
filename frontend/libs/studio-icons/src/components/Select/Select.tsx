import React from 'react';
import { IconProps } from '../../types/IconProps';
import { SvgTemplate } from '../SvgTemplate';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Select } from '@studio/icons';
 */
export const Select = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
      <rect
        x='3.95972'
        y='6.90283'
        width='18'
        height='12'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M18.4597 12.5566H13.4597L15.9159 14.5566L18.4597 12.5566Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
    </SvgTemplate>
  );
};
