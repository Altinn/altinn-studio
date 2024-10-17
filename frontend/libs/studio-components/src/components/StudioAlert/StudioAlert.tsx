import React, { forwardRef } from 'react';
import { Alert, type AlertProps } from '@digdir/designsystemet-react';

type StudioAlertProps = Omit<AlertProps, 'size'> & {
  size?: 'sm' | 'md' | 'lg';
};

const StudioAlert = forwardRef<HTMLDivElement, StudioAlertProps>(
  ({ size = 'sm', ...rest }, ref) => {
    return <Alert {...rest} size={size} ref={ref} />;
  },
);

StudioAlert.displayName = 'StudioAlert';

export { StudioAlert };
