import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { NavBar } from '@altinn/icons';
 */
export const NavBar = ({ title, ...rest }: IconProps): JSX.Element => {
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
        d='M8.42627 11.8654C8.42627 12.7101 7.7547 13.3948 6.92627 13.3948C6.09784 13.3948 5.42627 12.7101 5.42627 11.8654C5.42627 11.0207 6.09784 10.3359 6.92627 10.3359C7.7547 10.3359 8.42627 11.0207 8.42627 11.8654Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <ellipse
        cx='12.5'
        cy='11.8653'
        rx='0.5'
        ry='0.509815'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <ellipse
        cx='18.0737'
        cy='11.8653'
        rx='0.5'
        ry='0.509815'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='1.5'
      />
      <path d='M4 19H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M4 5H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  );
};
