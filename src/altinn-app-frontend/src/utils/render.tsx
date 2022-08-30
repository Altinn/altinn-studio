import * as React from 'react';

import { ErrorMessage } from '@altinn/altinn-design-system';

import { SoftValidations } from 'src/features/form/components/SoftValidations';
import type { IComponentBindingValidation } from 'src/types';

import { getParsedLanguageFromText } from 'altinn-shared/utils';

export function renderValidationMessagesForComponent(
  validationMessages: IComponentBindingValidation,
  id: string,
): JSX.Element[] {
  if (!validationMessages) {
    return null;
  }
  const validationMessageElements: JSX.Element[] = [];
  if (validationMessages.errors && validationMessages.errors.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.errors,
        `error_${id}`,
        'error',
      ),
    );
  }

  if (validationMessages.warnings && validationMessages.warnings.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.warnings,
        `warning_${id}`,
        'warning',
      ),
    );
  }

  if (validationMessages.info && validationMessages.info.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(validationMessages.info, `info_${id}`, 'info'),
    );
  }

  if (validationMessages.success && validationMessages.success.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.success,
        `success_${id}`,
        'success',
      ),
    );
  }

  return validationMessageElements.length > 0
    ? validationMessageElements
    : null;
}

export function renderValidationMessages(
  messages: string[],
  id: string,
  variant: 'error' | 'warning' | 'info' | 'success',
) {
  if (variant !== 'error') {
    return (
      <SoftValidations variant={variant}>
        <ol id={id}>{messages.map(validationMessagesToList)}</ol>
      </SoftValidations>
    );
  }

  return (
    <div style={{ paddingTop: '0.375rem' }}>
      <ErrorMessage id={id}>
        <ol>{messages.map(validationMessagesToList)}</ol>
      </ErrorMessage>
    </div>
  );
}

const validationMessagesToList = (message: string, index: number) => (
  <li
    role='alert'
    key={`validationMessage-${index}`}
  >
    {getParsedLanguageFromText(message)}
  </li>
);
