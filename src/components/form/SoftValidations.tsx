import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';

export interface ISoftValidationProps {
  variant: SoftValidationVariant;
  errorMessages: string[];
}

export type SoftValidationVariant = 'warning' | 'info' | 'success';

export const validationMessagesToList = (message: string, index: number) => (
  <li key={`validationMessage-${index}`}>{getParsedLanguageFromText(message)}</li>
);

export function SoftValidations({ variant, errorMessages }: ISoftValidationProps) {
  const { langAsString } = useLanguage();

  /**
   * Rendering the error messages as an ordered
   * list with each error message as a list item.
   */
  const ariaLabel = langAsString(errorMessages.join());

  return (
    <AlertBaseComponent
      severity={variant}
      useAsAlert={true}
      ariaLabel={ariaLabel}
    >
      <ol style={{ paddingLeft: 0 }}>{errorMessages.map(validationMessagesToList)}</ol>
    </AlertBaseComponent>
  );
}
