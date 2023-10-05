import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Likert } from '@altinn/icons';
 */
export const Likert = ({ title, ...rest }: IconProps): JSX.Element => {
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
        d='M4.43774 12.9028L19.9998 12.9028'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M6.71973 8.0918L7.71973 8.0918'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M6.71973 17.0181L7.71973 17.0181'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M10.416 8.0918L11.416 8.0918'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M10.416 17.0181L11.416 17.0181'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M14.1121 8.0918L15.1121 8.0918'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M14.1121 17.0181L15.1121 17.0181'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M17.8083 8.0918L18.8083 8.0918'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M17.8083 17.0181L18.8083 17.0181'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M4.10965 4.0049L12.2432 4.00488L20 4.0049'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M3.99999 4.00146L4 19.9982'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
};
