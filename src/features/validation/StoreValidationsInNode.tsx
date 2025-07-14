import React, { useEffect } from 'react';

import deepEqual from 'fast-deep-equal';

import { useNodeValidation } from 'src/features/validation/nodeValidation/useNodeValidation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { useIsHidden } from 'src/utils/layout/hidden';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, AttachmentValidation } from 'src/features/validation/index';
import type { CompExternal, CompIntermediate } from 'src/layout/layout';

export function StoreValidationsInNode() {
  return (
    <WhenParentAdded>
      <StoreValidationsInNodeWorker />
    </WhenParentAdded>
  );
}

function StoreValidationsInNodeWorker() {
  const item = GeneratorInternal.useIntermediateItem()!;
  const parent = GeneratorInternal.useParent();
  const shouldValidate = shouldValidateNode(item);

  // We intentionally break the rules of hooks eslint rule here. The shouldValidateNode function depends on the
  // component configuration (specifically, the renderAsSummary property), which cannot change over time (it is not an
  // expression). Therefore, we can safely ignore lint rule here, as we'll always re-render with the same number of
  // hooks. If the property changes (from DevTools, for example), the entire form will re-render anyway.
  if (shouldValidate && parent.baseId) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useStoreValidations(parent.baseId);
  }

  return null;
}

function useStoreValidations(baseComponentId: string) {
  const indexedId = useIndexedId(baseComponentId);
  const freshValidations = useNodeValidation(baseComponentId);
  const validations = useUpdatedValidations(freshValidations, indexedId);

  const shouldSetValidations = NodesInternal.useNodeData(
    indexedId,
    undefined,
    (data) => !deepEqual('validations' in data ? data.validations : undefined, validations),
  );

  const setNodeProp = NodesInternal.useSetNodeProp();
  useEffect(() => {
    shouldSetValidations && setNodeProp({ nodeId: indexedId, prop: 'validations', value: validations });
  }, [indexedId, setNodeProp, shouldSetValidations, validations]);

  // Reduce visibility as validations are fixed
  const visibilityToSet = NodesInternal.useNodeData(indexedId, undefined, (data) => {
    if (!('validationVisibility' in data)) {
      return undefined;
    }
    const currentValidationMask = validations.reduce((mask, { category }) => mask | category, 0);
    const newVisibilityMask = currentValidationMask & data.validationVisibility;
    if ((newVisibilityMask | data.initialVisibility) !== data.validationVisibility) {
      return newVisibilityMask | data.initialVisibility;
    }
    return undefined;
  });

  useEffect(() => {
    visibilityToSet !== undefined &&
      setNodeProp({ nodeId: indexedId, prop: 'validationVisibility', value: visibilityToSet });
  }, [indexedId, setNodeProp, visibilityToSet]);

  // Hidden state needs to be set for validations as a temporary solution
  const hidden = useIsHidden(baseComponentId, { respectPageOrder: true });
  const shouldSetHidden = NodesInternal.useNodeData(indexedId, undefined, (data) =>
    'hidden' in data ? data.hidden !== hidden : true,
  );

  useEffect(() => {
    shouldSetHidden && setNodeProp({ nodeId: indexedId, prop: 'hidden', value: hidden });
  }, [hidden, indexedId, setNodeProp, shouldSetHidden]);
}

function useUpdatedValidations(validations: AnyValidation[], nodeId: string) {
  return NodesInternal.useNodeData(nodeId, undefined, (data) => {
    if (!('validations' in data) || !data.validations) {
      return validations;
    }

    const copy = [...validations];
    for (const [idx, validation] of copy.entries()) {
      if (!('attachmentId' in validation)) {
        continue;
      }
      // Preserve the visibility of existing attachment validations
      const existing = data.validations.find(
        (v) => 'attachmentId' in v && v.attachmentId === validation.attachmentId,
      ) as AttachmentValidation;
      if (existing) {
        copy[idx] = { ...validation, visibility: existing.visibility };
      }
    }

    return copy;
  });
}

export function shouldValidateNode(item: CompExternal | CompIntermediate): boolean {
  return !('renderAsSummary' in item && item.renderAsSummary);
}
