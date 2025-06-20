import React from 'react';

import { Alert as AlertDesignSystem, ErrorMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useCurrentNode } from 'src/layout/FormComponentContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { BaseValidation, NodeValidation } from 'src/features/validation';
import type { AlertSeverity } from 'src/layout/Alert/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface Props {
  validations: NodeValidation[] | undefined;
  node: LayoutNode;
}

export function AllComponentValidations({ node: _node }: { node?: LayoutNode }) {
  const currentNode = useCurrentNode();
  const node = _node ?? currentNode;
  if (!node) {
    throw new Error('No node provided to AllComponentValidations. Please report this bug.');
  }
  const validations = useUnifiedValidationsForNode(node);
  return (
    <ComponentValidations
      validations={validations}
      node={node}
    />
  );
}

export function ComponentValidations({ validations, node: _node }: Props) {
  const currentNode = useCurrentNode();
  const node = _node ?? currentNode;
  const inputMaxLength = useNodeItem(node, (i) =>
    i.type === 'Input' || i.type === 'TextArea' ? i.maxLength : undefined,
  );

  // If maxLength is set in both schema and component, don't display the schema error message here.
  // TODO: This should preferably be implemented in the Input component, via ValidationFilter, but that causes
  // cypress tests in `components.ts` to fail.
  // @see https://github.com/Altinn/app-frontend-react/issues/1263
  const filteredValidations = inputMaxLength
    ? validations?.filter(
        (validation) =>
          !(
            validation.message.key === 'validation_errors.maxLength' &&
            validation.message.params?.at(0) === inputMaxLength
          ),
      )
    : validations;

  const errors = validationsOfSeverity(filteredValidations, 'error');
  const warnings = validationsOfSeverity(filteredValidations, 'warning');
  const info = validationsOfSeverity(filteredValidations, 'info');
  const success = validationsOfSeverity(filteredValidations, 'success');

  if (!node || !filteredValidations?.length) {
    return null;
  }

  return (
    <div
      aria-live='assertive'
      style={{ display: 'contents' }}
    >
      <div data-validation={node.id}>
        {errors.length > 0 && <ErrorValidations validations={errors} />}
        {warnings.length > 0 && (
          <SoftValidations
            validations={warnings}
            severity='warning'
          />
        )}
        {info.length > 0 && (
          <SoftValidations
            validations={info}
            severity='info'
          />
        )}
        {success.length > 0 && (
          <SoftValidations
            validations={success}
            severity='success'
          />
        )}
      </div>
    </div>
  );
}

function ErrorValidations({ validations }: { validations: BaseValidation<'error'>[] }) {
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

  return (
    <ul style={{ padding: 0, margin: 0, listStyleType: 'none' }}>
      {validations.map((validation) => (
        <li key={getUniqueKeyFromObject(validation)}>
          <ErrorMessage size='small'>
            <Lang
              id={validation.message.key}
              params={validation.message.params}
            />
          </ErrorMessage>
        </li>
      ))}
    </ul>
  );
}

function SoftValidations({
  validations,
  severity,
}: {
  validations: BaseValidation<'warning' | 'info' | 'success'>[];
  severity: AlertSeverity;
}) {
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

  return (
    <div style={{ paddingTop: 'var(--fds-spacing-2)' }}>
      <AlertDesignSystem
        style={{ breakInside: 'avoid' }}
        severity={severity}
      >
        <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
          {validations.map((validation) => (
            <li key={getUniqueKeyFromObject(validation)}>
              <Lang
                id={validation.message.key}
                params={validation.message.params}
              />
            </li>
          ))}
        </ul>
      </AlertDesignSystem>
    </div>
  );
}
