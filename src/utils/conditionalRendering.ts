import dot from 'dot-object';

import { splitDashedKey } from 'src/utils/formLayout';
import type { IConditionalRenderingRule, IConditionalRenderingRules } from 'src/features/form/dynamics';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

/**
 * Runs conditional rendering rules, returns Set of hidden component IDs
 */
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules | null,
  nodes: LayoutPages,
): Set<string> {
  const componentsToHide = new Set<string>();
  if (!window.conditionalRuleHandlerObject) {
    // rules have not been initialized
    return componentsToHide;
  }

  if (!rules || Object.keys(rules).length === 0) {
    return componentsToHide;
  }

  const topLevelNode = nodes.allNodes()[0] as LayoutNode | undefined;
  for (const key of Object.keys(rules)) {
    if (!key) {
      continue;
    }

    const connection: IConditionalRenderingRule = rules[key];
    if (connection.repeatingGroup) {
      const node = nodes.findById(connection.repeatingGroup.groupId);
      if (node?.isType('RepeatingGroup')) {
        for (const row of node.item.rows) {
          const firstChild = row.items[0] as LayoutNode | undefined;
          runConditionalRenderingRule(connection, firstChild, componentsToHide);
          if (connection.repeatingGroup.childGroupId) {
            const childId = `${connection.repeatingGroup.childGroupId}-${row.index}`;
            const childNode = node.flat(true, row.index).find((n) => n.item.id === childId);
            if (childNode && childNode.isType('RepeatingGroup')) {
              for (const childRow of childNode.item.rows) {
                const firstNestedChild = childRow.items[0] as LayoutNode | undefined;
                runConditionalRenderingRule(connection, firstNestedChild, componentsToHide);
              }
            }
          }
        }
      }
    } else {
      runConditionalRenderingRule(connection, topLevelNode, componentsToHide);
    }
  }

  return componentsToHide;
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  node: LayoutNode | undefined,
  hiddenFields: Set<string>,
) {
  const functionToRun = rule.selectedFunction;
  const inputKeys = Object.keys(rule.inputParams);
  const formData = node?.getDataSources().formData || {};

  const inputObj = {} as Record<string, string | number | boolean | null>;
  for (const key of inputKeys) {
    const param = rule.inputParams[key].replace(/{\d+}/g, '');
    const transposed = node?.transposeDataModel(param) ?? param;
    const value = dot.pick(transposed, formData);

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      inputObj[key] = value;
    } else {
      inputObj[key] = null;
    }
  }

  const result = window.conditionalRuleHandlerObject[functionToRun](inputObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);

  const splitId = splitDashedKey(node?.item.id ?? '');
  for (const elementToPerformActionOn of Object.keys(rule.selectedFields)) {
    if (elementToPerformActionOn && hide) {
      const elementId = rule.selectedFields[elementToPerformActionOn].replace(/{\d+}/g, (match) => {
        const index = match.replace(/[{}]/g, '');
        return `-${splitId.depth[index]}`;
      });

      hiddenFields.add(elementId);
    }
  }
}
