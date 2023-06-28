import React, { ReactNode } from 'react';
import classes from './ResourceDeployStatus.module.css';
import { XMarkOctagonFillIcon, CheckmarkCircleFillIcon } from '@navikt/aksel-icons';

interface Props {
  type: 'danger' | 'success';
  children: ReactNode;
}

/**
 * Displays a red danger card or a green success card, as well as a message
 *
 * @param props.type danger or success
 * @param props.message the message to display
 */
export const ResourceDeployStatus = ({ type, children }: Props) => {
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
      {children}
    </div>
  );
};
