import { useEffect } from 'react';

import { useDynamics } from 'src/features/form/dynamics/DynamicsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { IConditionalRenderingRule } from 'src/features/form/dynamics/index';
import type { FormDataSelector } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';

/**
 * This replaces checkIfConditionalRulesShouldRunSaga(), and fixes a problem that was hard to solve in sagas;
 * namely, that expressions that cause a component to suddenly be visible might also cause other component lookups
 * to start producing a value, so we don't really know how many times we need to run the expressions to reach
 * a stable state. As React hooks are...reactive, we can just run the expressions again when the data changes, and
 * thus continually run the expressions until they stabilize. You _could_ run into an infinite loop if you
 * have a circular dependency in your expressions, but that's a problem with your form, not this code.
 */
export function HiddenComponentsProvider() {
  const hidden = useLegacyHiddenComponents();
  const setHidden = NodesInternal.useMarkHiddenViaRule();

  useEffect(() => {
    setHidden(hidden);
  }, [hidden, setHidden]);

  return null;
}

function useLegacyHiddenComponents() {
  const rules = useDynamics()?.conditionalRendering ?? null;
  const transposeSelector = useDataModelBindingTranspose();
  const formDataSelector = FD.useDebouncedSelector();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const traversalSelector = useNodeTraversalSelector();
  const hiddenNodes: { [nodeId: string]: true } = {};

  if (!window.conditionalRuleHandlerObject || !rules || Object.keys(rules).length === 0) {
    // Rules have not been initialized
    return hiddenNodes;
  }

  const props = [hiddenNodes, formDataSelector, transposeSelector] as const;
  const topLevelNode = traversalSelector((t) => t.allNodes()[0], []);
  for (const key of Object.keys(rules)) {
    if (!key) {
      continue;
    }

    const rule: IConditionalRenderingRule = rules[key];
    if (rule.repeatingGroup) {
      const groupId = rule.repeatingGroup.groupId;
      const node = traversalSelector((t) => t.findById(groupId), [groupId]);
      if (node?.isType('RepeatingGroup')) {
        const firstChildren = nodeDataSelector(
          (picker) => picker(node)?.item?.rows.map((row) => row?.items?.[0]),
          [node],
        );
        for (const firstChild of firstChildren ?? []) {
          runConditionalRenderingRule(rule, firstChild, ...props);
          if (rule.repeatingGroup.childGroupId && firstChild) {
            const rowIndex = firstChild.rowIndex!;
            const childId = `${rule.repeatingGroup.childGroupId}-${rowIndex}`;
            const childNode = traversalSelector(
              (t) =>
                t
                  .with(node)
                  .flat(undefined, rowIndex)
                  .find((n) => n.id === childId),
              [node, rowIndex, childId],
            );
            if (childNode && childNode.isType('RepeatingGroup')) {
              const nestedChildren = nodeDataSelector(
                (picker) => picker(childNode)?.item?.rows.map((row) => row?.items?.[0]),
                [childNode],
              );
              for (const firstNestedChild of nestedChildren ?? []) {
                runConditionalRenderingRule(rule, firstNestedChild, ...props);
              }
            }
          }
        }
      }
    } else {
      runConditionalRenderingRule(rule, topLevelNode, ...props);
    }
  }

  return hiddenNodes;
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  node: LayoutNode | undefined,
  hiddenNodes: { [nodeId: string]: true },
  formDataSelector: FormDataSelector,
  transposeSelector: DataModelTransposeSelector,
) {
  const functionToRun = rule.selectedFunction;
  const inputKeys = Object.keys(rule.inputParams);

  const inputObj = {} as Record<string, string | number | boolean | null>;
  for (const key of inputKeys) {
    const param = rule.inputParams[key].replace(/{\d+}/g, '');
    const transposed = (node ? transposeSelector(node, param) : undefined) ?? param;
    const value = formDataSelector(transposed);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      inputObj[key] = value;
    } else {
      inputObj[key] = null;
    }
  }

  const result = window.conditionalRuleHandlerObject[functionToRun](inputObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);

  const splitId = splitDashedKey(node?.id ?? '');
  for (const elementToPerformActionOn of Object.keys(rule.selectedFields)) {
    if (elementToPerformActionOn && hide) {
      const elementId = rule.selectedFields[elementToPerformActionOn].replace(/{\d+}/g, (match) => {
        const index = match.replace(/[{}]/g, '');
        return `-${splitId.depth[index]}`;
      });

      hiddenNodes[elementId] = true;
    }
  }
}
