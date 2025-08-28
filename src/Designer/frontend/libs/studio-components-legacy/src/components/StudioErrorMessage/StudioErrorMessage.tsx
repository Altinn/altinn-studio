import React, { forwardRef } from 'react';
import type { ErrorMessageProps } from '@digdir/designsystemet-react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioErrorMessageProps = WithoutAsChild<ErrorMessageProps>;

/**
 * @deprecated Use `StudioValidationMessage` from `@studio/components` instead.
 */
export const StudioErrorMessage = forwardRef<HTMLParagraphElement, StudioErrorMessageProps>(
  (props, ref) => <ErrorMessage size='sm' {...props} ref={ref} />,
);

StudioErrorMessage.displayName = 'StudioErrorMessage';
