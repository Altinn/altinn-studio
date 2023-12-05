import React from 'react';
import { IconProps } from '../../types/IconProps';
import { SvgTemplate } from '../SvgTemplate';

/**
 * @param {IconProps} props the icon props
 * @returns {JSX.Element} the icon as a react component
 * @example
 * import { Paragraph } from '@studio/icons';
 */
export const Paragraph = (props: IconProps): JSX.Element => {
  return (
    <SvgTemplate {...props}>
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
    </SvgTemplate>
  );
};
