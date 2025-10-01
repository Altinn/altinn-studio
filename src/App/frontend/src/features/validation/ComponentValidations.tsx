import React from 'react';

import { Alert as AlertDesignSystem, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/features/validation/ComponentValidations.module.css';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { useCurrentComponentId } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { BaseValidation, NodeRefValidation } from 'src/features/validation';
import type { AlertSeverity } from 'src/layout/Alert/config.generated';

interface Props {
  validations: NodeRefValidation[] | undefined;
  baseComponentId: string;
}

export function AllComponentValidations({ baseComponentId: _baseId }: { baseComponentId?: string }) {
  const currentId = useCurrentComponentId();
  const baseId = _baseId ?? currentId;
  if (!baseId) {
    throw new Error('No component id provided to AllComponentValidations. Please report this bug.');
  }
  const validations = useUnifiedValidationsForNode(baseId);
  return (
    <ComponentValidations
      validations={validations}
      baseComponentId={baseId}
    />
  );
}

export function ComponentValidations({ validations, baseComponentId }: Props) {
  const currentId = useCurrentComponentId();
  const baseId = baseComponentId ?? currentId;
  const indexedId = useIndexedId(baseId);
  const inputItem = useItemIfType<'Input' | 'TextArea'>(baseId, (type) => type === 'Input' || type === 'TextArea');
  const inputMaxLength = inputItem?.maxLength;

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

  if (!baseId || !filteredValidations?.length) {
    return null;
  }

  return (
    <div
      aria-live='assertive'
      style={{ display: 'contents' }}
    >
      <div data-validation={indexedId}>
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
    <ul className={classes.errorList}>
      {validations.map((validation) => (
        <li key={getUniqueKeyFromObject(validation)}>
          <ValidationMessage
            data-size='sm'
            asChild
          >
            <span>
              <Lang
                id={validation.message.key}
                params={validation.message.params}
                customTextParameters={validation.message.customTextParameters}
              />
            </span>
          </ValidationMessage>
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
    <div style={{ paddingTop: 'var(--ds-size-2)' }}>
      <AlertDesignSystem
        style={{ breakInside: 'avoid' }}
        data-color={severity}
      >
        <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
          {validations.map((validation) => (
            <li key={getUniqueKeyFromObject(validation)}>
              <Lang
                id={validation.message.key}
                params={validation.message.params}
                customTextParameters={validation.message.customTextParameters}
              />
            </li>
          ))}
        </ul>
      </AlertDesignSystem>
    </div>
  );
}
