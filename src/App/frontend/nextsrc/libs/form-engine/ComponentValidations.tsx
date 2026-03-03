import React from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

import { useFieldValidations } from 'nextsrc/libs/form-client/react/hooks';

interface ComponentValidationsProps {
  bindingPath: string | undefined;
}

export const ComponentValidations = ({ bindingPath }: ComponentValidationsProps) => {
  const validations = useFieldValidations(bindingPath ?? '');

  if (!bindingPath || validations.length === 0) {
    return null;
  }

  const errors = validations.filter((v) => v.severity === 'error');
  const others = validations.filter((v) => v.severity !== 'error');

  return (
    <div data-testid='field-validation-messages'>
      {errors.map((v, i) => (
        <ValidationMessage
          key={i}
          data-size='sm'
          asChild
        >
          <span role='alert'>{v.message}</span>
        </ValidationMessage>
      ))}
      {others.map((v, i) => (
        <div
          key={`other-${i}`}
          role='status'
          data-color={v.severity === 'warning' ? 'warning' : v.severity === 'info' ? 'info' : 'success'}
          style={{
            fontSize: 'var(--ds-font-size-sm)',
            marginTop: 'var(--ds-spacing-1)',
          }}
        >
          {v.message}
        </div>
      ))}
    </div>
  );
};
