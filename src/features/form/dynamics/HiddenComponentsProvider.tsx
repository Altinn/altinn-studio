import { useEffect } from 'react';

import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useDynamics } from 'src/features/form/dynamics/DynamicsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IConditionalRenderingRule, IConditionalRenderingRules } from 'src/features/form/dynamics/index';
import type { FormDataSelector } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { NodeData } from 'src/utils/layout/types';

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

interface RepeatingGroup {
  numRows: number;
  binding: IDataModelReference | undefined;
}

interface TopLevelRepeatingGroup extends RepeatingGroup {
  nestedGroups: { [groupId: string]: RepeatingGroup | undefined };
}

type RepeatingGroupMap = { [groupId: string]: TopLevelRepeatingGroup | undefined };

function useAllReferencedGroups(rules: IConditionalRenderingRules | null) {
  const rowsSelector = FD.useDebouncedRowsSelector();
  return NodesInternal.useMemoSelector((state) => {
    if (!window.conditionalRuleHandlerObject || !rules || Object.keys(rules).length === 0) {
      return {};
    }

    const out: RepeatingGroupMap = {};
    for (const key of Object.keys(rules)) {
      const rule: IConditionalRenderingRule | undefined = key ? rules[key] : undefined;
      if (rule?.repeatingGroup) {
        const nodeData = state.nodeData[rule.repeatingGroup.groupId];
        if (nodeData && isRepeatedGroup(nodeData)) {
          const binding = nodeData.dataModelBindings.group;
          const numRows = rowsSelector(binding).length;
          const topLevel: TopLevelRepeatingGroup = { numRows, binding, nestedGroups: {} };
          if (rule.repeatingGroup.childGroupId) {
            for (const rowIndex of Array.from({ length: numRows }, (_, i) => i)) {
              const childId = `${rule.repeatingGroup.childGroupId}-${rowIndex}`;
              const childNodeData = state.nodeData[childId];
              if (childNodeData && isRepeatedGroup(childNodeData)) {
                const childBinding = childNodeData.dataModelBindings.group;
                const childNumRows = rowsSelector(childBinding).length;
                topLevel.nestedGroups[childId] = {
                  numRows: childNumRows,
                  binding: childBinding,
                };
              }
            }
          }

          out[nodeData.id] = topLevel;
        }
      }
    }

    return out;
  });
}

function useLegacyHiddenComponents() {
  const rules = useDynamics()?.conditionalRendering ?? null;
  const formDataSelector = FD.useDebouncedSelector();
  const hiddenNodes: { [nodeId: string]: true } = {};
  const defaultDataType = useCurrentDataModelName() ?? '';
  const topLevelGroups = useAllReferencedGroups(rules);

  if (!window.conditionalRuleHandlerObject || !rules || Object.keys(rules).length === 0) {
    // Rules have not been initialized
    return hiddenNodes;
  }

  const props = [defaultDataType, hiddenNodes, formDataSelector] as const;
  for (const key of Object.keys(rules)) {
    const rule: IConditionalRenderingRule | undefined = key ? rules[key] : undefined;
    if (!rule) {
      continue;
    }

    if (rule.repeatingGroup) {
      const groupId = rule.repeatingGroup.groupId;
      const group = topLevelGroups[groupId];
      if (!group) {
        continue;
      }
      for (const rowIndex of Array.from({ length: group.numRows }, (_, i) => i)) {
        if (rule.repeatingGroup.childGroupId) {
          const nestedGroup = group.nestedGroups[`${rule.repeatingGroup.childGroupId}-${rowIndex}`];
          if (!nestedGroup) {
            continue;
          }
          for (const nestedRowIndex of Array.from({ length: nestedGroup.numRows }, (_, i) => i)) {
            runConditionalRenderingRule(rule, nestedGroup.binding, [rowIndex, nestedRowIndex], ...props);
          }
        } else {
          runConditionalRenderingRule(rule, group.binding, [rowIndex], ...props);
        }
      }
    } else {
      runConditionalRenderingRule(rule, undefined, undefined, ...props);
    }
  }

  return hiddenNodes;
}

function isRepeatedGroup(nodeData: NodeData): nodeData is NodeData<'RepeatingGroup'> {
  return nodeData.nodeType === 'RepeatingGroup';
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  currentLocation: IDataModelReference | undefined,
  rowIndexes: number[] | undefined,
  defaultDataType: string,
  hiddenNodes: { [nodeId: string]: true },
  formDataSelector: FormDataSelector,
) {
  const functionToRun = rule.selectedFunction;
  const inputKeys = Object.keys(rule.inputParams);

  const inputObj = {} as Record<string, string | number | boolean | null>;
  for (const key of inputKeys) {
    const param = rule.inputParams[key].replace(/{\d+}/g, '');
    const subject: IDataModelReference = { dataType: defaultDataType, field: param };
    const transposed =
      currentLocation && rowIndexes
        ? transposeDataBinding({
            subject,
            currentLocation,
            rowIndex: rowIndexes.at(-1),
            currentLocationIsRepGroup: true,
          })
        : subject;
    const value = formDataSelector(transposed);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      inputObj[key] = value;
    } else {
      inputObj[key] = null;
    }
  }

  const func = window.conditionalRuleHandlerObject[functionToRun];
  if (!func || typeof func !== 'function') {
    window.logErrorOnce(
      `Conditional rule function '${functionToRun}' not found, rules referencing this function will not run.`,
    );
    return;
  }

  const result = func(inputObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);

  for (const elementToPerformActionOn of Object.keys(rule.selectedFields)) {
    if (elementToPerformActionOn && hide) {
      const elementId = rowIndexes
        ? rule.selectedFields[elementToPerformActionOn].replace(/{\d+}/g, (match) => {
            const index = match.replace(/[{}]/g, '');
            return `-${rowIndexes[index]}`;
          })
        : rule.selectedFields[elementToPerformActionOn];

      hiddenNodes[elementId] = true;
    }
  }
}
