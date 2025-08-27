import React from 'react';
import { Alert, type AlertProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioErrorProps = Omit<WithoutAsChild<AlertProps>, 'severity'>;

/**
 * @deprecated Use `StudioError` from `@studio/components` instead.
 */
export const StudioError = ({ children, ...rest }: StudioErrorProps) => {
  return (
    <Alert {...rest} severity='danger'>
      {children}
    </Alert>
  );
};
