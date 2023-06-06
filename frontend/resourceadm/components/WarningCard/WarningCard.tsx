import React from 'react';
import classes from './WarningCard.module.css';
import { ExclamationmarkTriangleFillIcon } from '@navikt/aksel-icons';

interface Props {
  text: string;
}

/**
 * Displays a pink warning card with some warning text
 *
 * @param props.text the text to display
 */
export const WarningCard = ({ text }: Props) => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.iconWrapper}>
        <ExclamationmarkTriangleFillIcon title='Warning Icon' fontSize='1.5rem' />
      </div>
      <p>{text}</p>
    </div>
  );
};
