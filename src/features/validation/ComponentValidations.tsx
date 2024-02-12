import React from 'react';

import { ErrorMessage } from '@digdir/design-system-react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import type { NodeValidation } from 'src/features/validation';
import type { AlertSeverity } from 'src/layout/Alert/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type Props = {
  validations: NodeValidation[] | undefined;
  node?: LayoutNode;
};

export function ComponentValidations({ validations, node }: Props) {
  if (!validations || validations.length === 0) {
    return null;
  }
  const errors = validationsOfSeverity(validations, 'error');
  const warnings = validationsOfSeverity(validations, 'warning');
  const info = validationsOfSeverity(validations, 'info');
  const success = validationsOfSeverity(validations, 'success');

  return (
    <div data-validation={node?.item.id}>
      {errors.length > 0 && (
        <ErrorValidations
          validations={errors}
          node={node}
        />
      )}
      {warnings.length > 0 && (
        <SoftValidations
          validations={warnings}
          variant='warning'
          node={node}
        />
      )}
      {info.length > 0 && (
        <SoftValidations
          validations={info}
          variant='info'
          node={node}
        />
      )}
      {success.length > 0 && (
        <SoftValidations
          validations={success}
          variant='success'
          node={node}
        />
      )}
    </div>
  );
}

function ErrorValidations({ validations, node }: { validations: NodeValidation<'error'>[]; node?: LayoutNode }) {
  return (
    <div style={{ paddingTop: '0.375rem' }}>
      <ErrorMessage size='small'>
        <ol style={{ padding: 0, margin: 0, listStyleType: 'none' }}>
          {validations.map((validation) => (
            <li
              role='alert'
              key={`validationMessage-${validation.message.key}`}
            >
              <Lang
                id={validation.message.key}
                params={validation.message.params}
                node={node}
              />
            </li>
          ))}
        </ol>
      </ErrorMessage>
    </div>
  );
}

function SoftValidations({
  validations,
  variant,
  node,
}: {
  validations: NodeValidation<'warning' | 'info' | 'success'>[];
  variant: AlertSeverity;
  node?: LayoutNode;
}) {
  const { langAsString } = useLanguage();

  /**
   * Rendering the error messages as an ordered
   * list with each error message as a list item.
   */
  const ariaLabel = validations.map((v) => langAsString(v.message.key, v.message.params)).join();

  return (
    <div style={{ paddingTop: 'var(--fds-spacing-2)' }}>
      <AlertBaseComponent
        severity={variant}
        useAsAlert={true}
        ariaLabel={ariaLabel}
      >
        <ol style={{ paddingLeft: 0 }}>
          {validations.map((validation) => (
            <li
              role='alert'
              key={`validationMessage-${validation.message.key}`}
            >
              <Lang
                id={validation.message.key}
                params={validation.message.params}
                node={node}
              />
            </li>
          ))}
        </ol>
      </AlertBaseComponent>
    </div>
  );
}
