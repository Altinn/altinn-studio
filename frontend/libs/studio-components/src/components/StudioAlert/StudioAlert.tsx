import React, { forwardRef } from 'react';
import { Alert, type AlertProps } from '@digdir/designsystemet-react';

export type StudioAlertProps = AlertProps;

const StudioAlert = forwardRef<HTMLDivElement, StudioAlertProps>(
  ({ size = 'sm', ...rest }, ref) => {
    return <Alert {...rest} size={size} ref={ref} />;
  },
);

StudioAlert.displayName = 'StudioAlert';

export { StudioAlert };
