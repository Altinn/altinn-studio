import React from 'react';

import { useFieldValidations } from 'nextsrc/libs/form-client/react/hooks';

interface ComponentValidationsProps {
  bindingPath: string | undefined;
}

export const ComponentValidations = ({ bindingPath }: ComponentValidationsProps) => {
  const validations = useFieldValidations(bindingPath ?? '');

  if (!bindingPath || validations.length === 0) {
    return null;
  }

  return (
    <div data-testid='field-validation-messages'>
      {validations.map((v, i) => (
        <div
          key={i}
          role={v.severity === 'error' ? 'alert' : 'status'}
          style={{
            color: v.severity === 'error' ? '#d32f2f' : v.severity === 'warning' ? '#ed6300' : '#0062ba',
            fontSize: '0.875rem',
            marginTop: '0.25rem',
          }}
        >
          {v.message}
        </div>
      ))}
    </div>
  );
};
