import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { ShortText } from '@altinn/icons';
 */
export const ShortText = ({ title, ...rest }: IconProps): JSX.Element => {
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
        x='3'
        y='6.83301'
        width='18'
        height='12'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path d='M6 10.0771H18' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path
        d='M6.00098 13.0771H12.001'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
};
