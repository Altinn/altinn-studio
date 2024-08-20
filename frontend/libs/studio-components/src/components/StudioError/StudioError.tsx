import React from 'react';
import { Alert } from '@digdir/designsystemet-react';

export type StudioErrorProps = {
  children?: React.ReactNode;
};

export const StudioError = ({ children }: StudioErrorProps) => {
  return <Alert severity='danger'>{children}</Alert>;
};
