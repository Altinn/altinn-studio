import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Alert } from '@digdir/designsystemet-react';
import type { AlertProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioAlertProps = WithoutAsChild<AlertProps>;

function StudioAlert(
  { children, ...rest }: StudioAlertProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <Alert {...rest} ref={ref}>
      {children}
    </Alert>
  );
}

const ForwardedStudioAlert = forwardRef(StudioAlert);

export { ForwardedStudioAlert as StudioAlert };
