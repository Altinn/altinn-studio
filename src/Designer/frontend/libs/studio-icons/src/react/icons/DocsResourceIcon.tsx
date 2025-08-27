import React from 'react';
import type { IconProps } from '../types';
import { SvgTemplate } from './SvgTemplate';

export const DocsResourceIcon = (props: IconProps): React.ReactElement => {
  return (
    <SvgTemplate viewBox='0 0 60 60' {...props}>
      <circle cx='30' cy='30' r='30' fill='#022F51' />
      <path
        d='M41 44H20V16H41V44ZM21.2353 42.7826H39.7647V17.2174H21.2353V42.7826Z'
        fill='#FFFEFE'
      />
      <path
        d='M24.9412 26.9565H36.0588V28.1739H24.9412V26.9565ZM24.9412 22.0869H31.1176V23.3043H24.9412V22.0869ZM24.9412 31.8261H36.0588V33.0435H24.9412V31.8261ZM24.9412 36.6956H36.0588V37.913H24.9412V36.6956Z'
        fill='#FFFEFE'
      />
    </SvgTemplate>
  );
};
