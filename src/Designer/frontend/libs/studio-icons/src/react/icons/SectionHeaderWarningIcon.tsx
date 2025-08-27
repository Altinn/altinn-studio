import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const SectionHeaderWarningIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate {...props}>
      <rect y='0.477051' width='24' height='24' rx='12' fill='#B3253A' />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M12.75 6.97705C12.75 6.56284 12.4142 6.22705 12 6.22705C11.5858 6.22705 11.25 6.56284 11.25 6.97705V14.9771C11.25 15.3913 11.5858 15.7271 12 15.7271C12.4142 15.7271 12.75 15.3913 12.75 14.9771V6.97705ZM12 16.9771C11.4477 16.9771 11 17.4248 11 17.9771C11 18.5293 11.4477 18.9771 12 18.9771C12.5523 18.9771 13 18.5293 13 17.9771C13 17.4248 12.5523 16.9771 12 16.9771Z'
        fill='white'
      />
    </SvgTemplate>
  );
};
