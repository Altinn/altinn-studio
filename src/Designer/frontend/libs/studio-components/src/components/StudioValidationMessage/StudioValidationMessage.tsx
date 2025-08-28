import React from 'react';
import type { ReactElement } from 'react';
import { ValidationMessage } from '@digdir/designsystemet-react';
import type { ValidationMessageProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioValidationMessageProps = WithoutAsChild<ValidationMessageProps>;

export function StudioValidationMessage({
  children,
  ...rest
}: StudioValidationMessageProps): ReactElement {
  return <ValidationMessage {...rest}>{children}</ValidationMessage>;
}
