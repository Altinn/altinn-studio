import React from 'react';
import { Alert, type AlertProps } from '@digdir/designsystemet-react';

export type StudioErrorProps = Omit<AlertProps, 'severity'>;

export const StudioError = ({ children, ...rest }: StudioErrorProps) => {
  return (
    <Alert {...rest} severity='danger'>
      {children}
    </Alert>
  );
};
