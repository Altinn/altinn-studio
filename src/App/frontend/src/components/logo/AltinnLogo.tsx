import React from 'react';

import { useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import classes from 'src/components/logo/AltinnLogo.module.css';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';

/** @see altinnAppTheme.tsx */
export enum LogoColor {
  blueDark = '#0062BA',
  blueDarker = '#022F51',
}

export interface IAltinnLogoProps {
  color: LogoColor;
  className?: string;
}

function useLogoSvg() {
  const { fetchLogo } = useAppQueries();
  return useQuery({
    queryKey: ['logoSvg'],
    queryFn: fetchLogo,
  });
}

function reColorSvg(svg: string, color: string) {
  const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const svgElement = dom.getElementsByTagName('svg')[0];

  const elements = svgElement.querySelectorAll('[fill]');
  let filled = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.getAttribute('fill') === 'none') {
      continue;
    }
    element.setAttribute('fill', color);
    filled++;
  }

  if (filled === 0) {
    const foundColors = svg.match(/fill="[^"]"/g);
    console.warn('Could not replace color in svg', { svg, color, foundColors });
    return svg;
  }

  return svgElement.outerHTML;
}

export const AltinnLogo = ({ color, className }: IAltinnLogoProps) => {
  const { data } = useLogoSvg();

  if (!data) {
    return <div className={classes.logo} />;
  }

  return (
    <img
      className={cn(classes.logo, className)}
      alt='Altinn logo'
      id='logo'
      src={`data:image/svg+xml;utf8,${encodeURIComponent(reColorSvg(data, color))}`}
    />
  );
};
