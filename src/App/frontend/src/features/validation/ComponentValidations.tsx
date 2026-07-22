import React from 'react';

import { ValidationMessages } from '@app/form-component';

import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { useCurrentComponentId } from 'src/layout/FormComponentContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemIfType } from 'src/utils/layout/useNodeItem';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation } from 'src/features/validation';

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
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

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

  if (!baseId || !filteredValidations?.length) {
    return null;
  }

  return (
    <ValidationMessages
      id={`${baseId}-validations`}
      dataValidation={indexedId}
      validations={filteredValidations.map((validation) => ({
        id: String(getUniqueKeyFromObject(validation)),
        severity: validation.severity,
        message: (
          <Lang
            id={validation.message.key}
            params={validation.message.params}
            customTextParameters={validation.message.customTextParameters}
          />
        ),
      }))}
    />
  );
}
