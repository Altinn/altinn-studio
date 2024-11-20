import React from 'react';

import deepEqual from 'fast-deep-equal';

import { useNodeValidation } from 'src/features/validation/nodeValidation/useNodeValidation';
import { getInitialMaskFromNodeItem } from 'src/features/validation/utils';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, StageFormValidation } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, AttachmentValidation } from 'src/features/validation/index';
import type { CompCategory } from 'src/layout/common';
import type { CompIntermediate, TypesFromCategory } from 'src/layout/layout';
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

  const freshValidations = useNodeValidation(node, shouldValidate);
  const validations = useUpdatedValidations(freshValidations, node);

  const shouldSetValidations = NodesInternal.useNodeData(node, (data) => !deepEqual(data.validations, validations));
  NodesStateQueue.useSetNodeProp(
    { node, prop: 'validations', value: validations },
    shouldSetValidations && shouldValidate,
  );

  // Reduce visibility as validations are fixed
  const initialVisibility = getInitialMaskFromNodeItem(item);
  const visibilityToSet = NodesInternal.useNodeData(node, (data) => {
    const currentValidationMask = validations.reduce((mask, { category }) => mask | category, 0);
    const newVisibilityMask = currentValidationMask & data.validationVisibility;
    if ((newVisibilityMask | initialVisibility) !== data.validationVisibility) {
      return newVisibilityMask | initialVisibility;
    }
    return undefined;
  });

  NodesStateQueue.useSetNodeProp(
    { node, prop: 'validationVisibility', value: visibilityToSet },
    visibilityToSet !== undefined,
  );

  return null;
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

export function shouldValidateNode(item: CompIntermediate): boolean {
  return !('renderAsSummary' in item && item.renderAsSummary);
}
