import React from 'react';
import type { CSSProperties } from 'react';

import classes from 'src/components/AltinnLoader.module.css';

export interface IAltinnLoaderProps {
  /** The id, defaults to 'altinn-loader' */
  id?: string;
  /** Content that is read by screen reader */
  srContent: string;
  /** Optional style */
  style?: CSSProperties;
  /** className */
  className?: string;
}

export function AltinnLoader({ id, style, className, srContent }: IAltinnLoaderProps) {
  return (
    <div
      aria-live='polite'
      className={className}
      id={id || 'altinn-loader'}
      style={style}
    >
      <div className={classes.loader} />
      <p className='sr-only'>{srContent}</p>
    </div>
  );
}
