import React from 'react';
import classes from './ScreenReaderLabel.module.css';
import { Label } from '@digdir/design-system-react';

export type ScreenReaderLabelProps = {
  /**
   * The htmlFor of the label. This must be the same as the id for the input field.
   */
  htmlFor: string;
  /**
   * The label text
   */
  label: string;
};

/**
 * @component
 * @example
 *   <ScreenReaderLabel id='components-aria-labelledby' label='my label' />
 *
 * @property {string}[id] - The htmlFor of the label. This must be the same as the id for the input field.
 * @property {string}[label] - The label text
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ScreenReaderLabel = ({ htmlFor, label }: ScreenReaderLabelProps): React.ReactNode => {
  return (
    <Label htmlFor={htmlFor} className={classes.hideVisually}>
      {label}
    </Label>
  );
};
