import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidation } from 'src/features/validation';

export function lookupValidation(message: string, bindingKey?: string): ComponentValidation {
  return {
    message: { key: message },
    ...(bindingKey ? { bindingKey } : {}),
    source: FrontendValidationSource.Component,
    severity: 'error',
    category: ValidationMask.Component,
  };
}
