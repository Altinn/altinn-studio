import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { LongText } from '@altinn/icons';
 */
export const LongText = ({ title, ...rest }: IconProps): JSX.Element => {
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
        x='3.95972'
        y='4.76318'
        width='18'
        height='16'
        rx='3'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path
        d='M6.95972 14.4292H18.9597'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M6.95972 11.2388H18.9597'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M6.95972 8.04834H18.9597'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M6.96069 17.4292H12.9607'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
};
