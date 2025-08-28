import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioValidationMessage } from '../StudioValidationMessage';

export type ValidationMessageProps = {
  children: ReactNode;
  hidden?: boolean;
  id?: string;
};

export type StudioRadioGroupErrorProps = {
  validationMessageProps: ValidationMessageProps;
};

export function StudioRadioGroupError({
  validationMessageProps,
}: StudioRadioGroupErrorProps): ReactElement {
  return <StudioValidationMessage {...validationMessageProps} />;
}
