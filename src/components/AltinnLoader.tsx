import React from 'react';

export interface IAltinnLoaderProps {
  /** The id, defaults to 'altinn-loader' */
  id?: string;
  /** Content that is read by screen reader */
  srContent: string;
  /** Optional style */
  style?: any;
  /** className */
  className?: string;
}

export function AltinnLoader(props: IAltinnLoaderProps) {
  return (
    <div
      aria-live='polite'
      className={`a-loader ${props.className || ''}`}
      id={props.id || 'altinn-loader'}
      style={props.style}
    >
      <div className='loader loader-ellipsis' />
      <p className='sr-only'>{props.srContent}</p>
    </div>
  );
}
