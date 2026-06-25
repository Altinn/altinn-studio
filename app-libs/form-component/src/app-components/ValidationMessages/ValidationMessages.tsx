import type { ReactNode } from 'react';

import { ErrorValidations } from '@app/form-component/app-components/ErrorValidations';
import { SoftValidations } from '@app/form-component/app-components/SoftValidations';

export type ValidationSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ValidationMessageItem {
  /** Stable identifier for the message, unique within the list */
  id: string;
  severity: ValidationSeverity;
  /** Already translated/rendered message content */
  message: ReactNode;
}

export interface ValidationMessagesProps {
  /** Rendered as the wrapper div id  */
  id?: string;
  /** Rendered as the `data-validation` attribute (the app passes the indexed id) */
  dataValidation?: string;
  validations: ValidationMessageItem[];
}

function ofSeverity(validations: ValidationMessageItem[], severity: ValidationSeverity) {
  return validations.filter((validation) => validation.severity === severity);
}

export function ValidationMessages({ id, dataValidation, validations }: ValidationMessagesProps) {
  const errors = ofSeverity(validations, 'error');
  const warnings = ofSeverity(validations, 'warning');
  const info = ofSeverity(validations, 'info');
  const success = ofSeverity(validations, 'success');

  if (!validations.length) {
    return null;
  }

  return (
    <div id={id} data-validation={dataValidation} aria-live='assertive'>
      {errors.length > 0 && <ErrorValidations validations={errors} />}
      {warnings.length > 0 && <SoftValidations validations={warnings} severity='warning' />}
      {info.length > 0 && <SoftValidations validations={info} severity='info' />}
      {success.length > 0 && <SoftValidations validations={success} severity='success' />}
    </div>
  );
}
