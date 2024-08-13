import React from 'react';
import classes from './ConflictingImageSourceAlert.module.css';
import { Alert } from '@digdir/designsystemet-react';

interface ConflictingImageSourceAlertProps {
  showAlert: boolean;
  conflictSource: 'external' | 'relative';
}

export const ConflictingImageSourceAlert = ({
  showAlert,
  conflictSource,
}: ConflictingImageSourceAlertProps) => {
  return (
    showAlert && (
      <Alert size='small' className={classes.alert}>
        {conflictSource === 'external'
          ? 'Du har allerede lastet opp et bilde. Skriver du inn en url, vil bildereferansen din bli slettet.'
          : 'Du har allerede referert til en ekstern url. Laster du opp et bilde, vil den eksterne referansen bli slettet.'}
      </Alert>
    )
  );
};
