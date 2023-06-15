import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { XMarkOctagonFillIcon, CheckmarkCircleFillIcon } from '@navikt/aksel-icons';

interface Props {
  type: 'danger' | 'success';
  message: string;
}

/**
 * Displays a red danger card or a green success card, as well as a message
 *
 * @param props.type danger or success
 * @param props.message the message to display
 */
export const ResourceDeployStatus = ({ type, message }: Props) => {
  // TODO - Translate
  const displayIcon = () => {
    if (type === 'success') {
      return (
        <CheckmarkCircleFillIcon title='Suksess, ingen feil' className={classes.successIcon} />
      );
    }
    if (type === 'danger') {
      return <XMarkOctagonFillIcon title='Error, valideringsfeil' className={classes.dangerIcon} />;
    }
    return null;
  };
  return (
    <div className={`${classes[type]} ${classes.card}`}>
      {displayIcon()}
      <p>{message}</p>
    </div>
  );
};
