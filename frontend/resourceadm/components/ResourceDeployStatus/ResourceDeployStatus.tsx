import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { XMarkOctagonFillIcon, CheckmarkCircleFillIcon } from '@navikt/aksel-icons';
// import { Alert } from '@digdir/design-system-react';

interface Props {
  type: 'alert' | 'success';
  message: string;
}

export const ResourceDeployStatus = ({ type, message }: Props) => {
  const displayIcon = () => {
    if (type === 'success') {
      return (
        <CheckmarkCircleFillIcon title='Suksess, ingen feil' className={classes.successIcon} />
      );
    }
    if (type === 'alert') {
      return <XMarkOctagonFillIcon title='Error, valideringsfeil' className={classes.alertIcon} />;
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
