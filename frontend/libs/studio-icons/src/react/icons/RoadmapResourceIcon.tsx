import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const RoadmapResourceIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate viewBox='0 0 60 60' {...props}>
      <circle cx='30' cy='30' r='30' fill='#022F51' />
      <path
        d='M24.9692 31.011H26.2V44.5588H24.9692V31.011ZM24.9692 15H26.2V19.9265H24.9692V15ZM39.2462 31.011H15V21.1581H39.1231L47 26.0845L39.2462 31.011V31.011ZM16.2308 29.7794H38.8769L44.6615 26.0845L38.7538 22.3897H16.2308V29.7794Z'
        fill='white'
      />
    </SvgTemplate>
  );
};
