import React from 'react';

import { Lang } from 'src/features/language/Lang';
import type { IParty } from 'src/types/shared';

export interface InstantiationValidationResult {
  valid: boolean;
  message?: string;
  customTextKey?: string;
  customTextParameters?: Record<string, string>;
  validParties?: IParty[];
}

export function isInstantiationValidationResult(obj: unknown): obj is InstantiationValidationResult {
  return typeof obj === 'object' && obj != null && 'valid' in obj;
}

export function InstantiationValidation({ validationResult }: { validationResult: InstantiationValidationResult }) {
  if (validationResult.customTextKey) {
    return (
      <Lang
        id={validationResult.customTextKey}
        customTextParameters={validationResult.customTextParameters}
      />
    );
  }

  if (validationResult.message) {
    return <Lang id={validationResult.message} />;
  }

  return null;
}
