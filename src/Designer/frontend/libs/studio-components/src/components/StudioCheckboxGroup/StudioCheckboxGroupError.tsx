import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioValidationMessage } from '../StudioValidationMessage';

type ValidationMessageProps = {
  children: ReactNode;
  hidden?: boolean;
  id?: string;
};

export type StudioCheckboxGroupErrorProps = {
  validationMessageProps: ValidationMessageProps;
};

export function StudioCheckboxGroupError({
  validationMessageProps,
}: StudioCheckboxGroupErrorProps): ReactElement {
  return <StudioValidationMessage {...validationMessageProps} />;
}
