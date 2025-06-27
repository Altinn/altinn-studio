import React from 'react';

import deepEqual from 'fast-deep-equal';

import { useNodeValidation } from 'src/features/validation/nodeValidation/useNodeValidation';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, StageFormValidation } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, AttachmentValidation } from 'src/features/validation/index';
import type { CompCategory } from 'src/layout/common';
import type { CompExternal, CompIntermediate, TypesFromCategory } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export function StoreValidationsInNode() {
  return (
    <GeneratorCondition
      stage={StageFormValidation}
      mustBeAdded='parent'
    >
      <StoreValidationsInNodeWorker />
    </GeneratorCondition>
  );
}

type Node = LayoutNode<TypesFromCategory<CompCategory.Form | CompCategory.Container>>;

function StoreValidationsInNodeWorker() {
  const item = GeneratorInternal.useIntermediateItem()!;
  const node = GeneratorInternal.useParent() as Node;
  const shouldValidate = shouldValidateNode(item);

  // We intentionally break the rules of hooks eslint rule here. The shouldValidateNode function depends on the
  // component configuration (specifically, the renderAsSummary property), which cannot change over time (it is not an
  // expression). Therefore, we can safely ignore lint rule here, as we'll always re-render with the same number of
  // hooks. If the property changes (from DevTools, for example), the entire form will re-render anyway.
  if (shouldValidate) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useStoreValidations(node);
  }

  return null;
}

function useStoreValidations(node: Node) {
  const freshValidations = useNodeValidation(node);
  const validations = useUpdatedValidations(freshValidations, node);

  const shouldSetValidations = NodesInternal.useNodeData(node, (data) => !deepEqual(data.validations, validations));
  NodesStateQueue.useSetNodeProp({ node, prop: 'validations', value: validations }, shouldSetValidations);

  // Reduce visibility as validations are fixed
  const visibilityToSet = NodesInternal.useNodeData(node, (data) => {
    const currentValidationMask = validations.reduce((mask, { category }) => mask | category, 0);
    const newVisibilityMask = currentValidationMask & data.validationVisibility;
    if ((newVisibilityMask | data.initialVisibility) !== data.validationVisibility) {
      return newVisibilityMask | data.initialVisibility;
    }
    return undefined;
  });

  NodesStateQueue.useSetNodeProp(
    { node, prop: 'validationVisibility', value: visibilityToSet },
    visibilityToSet !== undefined,
  );
}

function useUpdatedValidations(validations: AnyValidation[], node: Node) {
  return NodesInternal.useNodeData(node, (data) => {
    if (!data.validations) {
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
