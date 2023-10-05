import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Paragraph } from '@altinn/icons';
 */
export const Paragraph = ({ title, ...rest }: IconProps): JSX.Element => {
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
      <path
        d='M4.95947 18.6934H12.9595'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.95947 10.6436H12.9595'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.95947 14.6934H20.9595'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.95947 6.69336H20.9595'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
};
