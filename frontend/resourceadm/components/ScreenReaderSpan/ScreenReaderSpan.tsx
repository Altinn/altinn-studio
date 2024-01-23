import React from 'react';
import classes from './ScreenReaderSpan.module.css';

type ScreenReaderSpanProps = {
  /**
   * The id of the span. This must be the same as the 'aria-labelledby' for the input field.
   */
  id: string;
  /**
   * The label inside the span
   */
  label: string;
};

/**
 * @component
 * @example
 *   <ScreenReaderSpan id='components-aria-labelledby' label='my label' />
 *
 * @property {string}[id] - The id of the span. This must be the same as the 'aria-labelledby' for the input field.
 * @property {string}[label] - The label inside the span
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ScreenReaderSpan = ({ id, label }: ScreenReaderSpanProps): React.JSX.Element => {
  return (
    <span id={id} className={classes.hideVisually}>
      {label}
    </span>
  );
};
