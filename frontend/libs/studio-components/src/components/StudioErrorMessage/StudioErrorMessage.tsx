import React, { forwardRef } from 'react';
import type { ErrorMessageProps } from '@digdir/designsystemet-react';
import { ErrorMessage } from '@digdir/designsystemet-react';

export type StudioErrorMessageProps = ErrorMessageProps;

export const StudioErrorMessage = forwardRef<HTMLParagraphElement, StudioErrorMessageProps>(
  (props, ref) => <ErrorMessage size='sm' {...props} ref={ref} />,
);

StudioErrorMessage.displayName = 'StudioErrorMessage';
