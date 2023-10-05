import React from 'react';
import { IconProps } from '../../types/IconProps';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Accordion } from '@altinn/icons';
 */
export const Accordion = ({ title, ...rest }: IconProps): JSX.Element => {
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
        d='M8.44434 10.1797L11.9375 13.6797L15.5554 10.1797'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path d='M4 19H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
      <path d='M4 5H20' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  );
};
