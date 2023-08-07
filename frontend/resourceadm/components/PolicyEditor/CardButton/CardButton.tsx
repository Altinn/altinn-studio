import React from 'react';
import classes from './CardButton.module.css';
import { PlusIcon } from '@navikt/aksel-icons';
import { Paragraph } from '@digdir/design-system-react';

interface Props {
  buttonText: string;
  onClick: () => void;
}

/**
 * Button component that displays a text and a plus icon.
 *
 * @param props.buttonText text to display on the button
 * @param props.onClick function for handling the button click
 *
 * TODO - Translate
 */
export const CardButton = ({ buttonText, onClick }: Props) => {
  return (
    <button className={classes.button} type='button' onClick={onClick}>
      <Paragraph size='small'>{buttonText}</Paragraph>
      <PlusIcon title='Add rule' fontSize='1.4rem' />
    </button>
  );
};
