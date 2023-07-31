import React from 'react';
import classes from './ScreenReaderLabel.module.css';

interface Props {
  /**
   * The text in the label
   */
  label: string;
  /**
   * The htmlFor for the component using the SR label
   */
  htmlFor: string;
}

/**
 * @component
 * @example
 *   <ScreenReaderLabel htmlFor='idOfComponent' label='my label' />
 *
 * @property {string}[label] - The text in the label
 * @property {string}[htmlFor] - The htmlFor for the component using the SR label
 *
 * @returns {React.ReactNode} - The rendered Screen reader label component
 */
export const ScreenReaderLabel = ({ label, htmlFor }: Props): React.ReactNode => {
  return (
    <label className={classes.hideVisually} htmlFor={htmlFor}>
      {label}
    </label>
  );
};
