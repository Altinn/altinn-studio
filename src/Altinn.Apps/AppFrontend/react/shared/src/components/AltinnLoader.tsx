import React from "react";

export interface IAltinnLoaderProps {
  /** The id, defaults to 'altinn-loader' */
  id?: string;
  /** Content that is read by screen reader */
  srContent: string;
  /** Optional style */
  style?: any;
}

export default function AltinnLoader(props: IAltinnLoaderProps) {
  return (
    <div 
      aria-live="polite"
      className="a-loader float-left"
      id={props.id || 'altinn-loader'}
      style={props.style}
    >
      <div className="loader loader-ellipsis"/>
      <p className="sr-only">{props.srContent}</p>
    </div>
  );
}