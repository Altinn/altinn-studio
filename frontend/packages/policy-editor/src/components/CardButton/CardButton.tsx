import React from 'react';
import classes from './CardButton.module.css';
import { PlusIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';

export type CardButtonProps = {
  /**
   * The text to display on the button
   */
  buttonText: string;
  /**
   * Function to handle buttonclick
   * @returns void
   */
  onClick: () => void;
};

/**
 * @component
 *    Button component that displays a text and a plus icon.
 *
 * @property {string}[buttonText] - The text to display on the button
 * @property {function}[onClick] - Function to handle buttonclick
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const CardButton = ({ buttonText, onClick }: CardButtonProps): React.ReactNode => {
  return (
    <button className={classes.button} type='button' onClick={onClick}>
      <Paragraph size='small'>{buttonText}</Paragraph>
      <PlusIcon fontSize='1.4rem' />
    </button>
  );
};
