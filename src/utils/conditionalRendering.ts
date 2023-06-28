import type {
  IConditionalRenderingRule,
  IConditionalRenderingRules,
  IParameters,
  ISelectedFields,
} from 'src/features/dynamics';
import type { IFormData } from 'src/features/formData';
import type { IRepeatingGroups } from 'src/types';

/**
 * Runs conditional rendering rules, returns Set of hidden component IDs
 */
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules | null,
  formData: IFormData | null,
  repeatingGroups: IRepeatingGroups | null,
): Set<string> {
  const componentsToHide = new Set<string>();
  if (!window.conditionalRuleHandlerHelper) {
    // rules have not been initialized
    return componentsToHide;
  }

  if (!rules || Object.keys(rules).length === 0) {
    return componentsToHide;
  }

  for (const key of Object.keys(rules)) {
    if (!key) {
      continue;
    }

    const connection: IConditionalRenderingRule = rules[key];
    if (connection.repeatingGroup) {
      const repeatingGroup = repeatingGroups && repeatingGroups[connection.repeatingGroup.groupId];
      if (!repeatingGroup) {
        continue;
      }

      for (let index = 0; index <= repeatingGroup.index; index++) {
        const connectionCopy = structuredClone(connection);
        connectionCopy.inputParams = mapRepeatingGroupIndex({
          ruleObject: connectionCopy.inputParams,
          index,
          dataModelField: true,
        });
        connectionCopy.selectedFields = mapRepeatingGroupIndex({
          ruleObject: connectionCopy.selectedFields,
          index,
        });

        if (connection.repeatingGroup.childGroupId) {
          const childGroup = repeatingGroups && repeatingGroups[`${connection.repeatingGroup.childGroupId}-${index}`];
          if (childGroup) {
            for (let childIndex = 0; childIndex <= childGroup?.index; childIndex++) {
              const connectionNestedCopy = structuredClone(connectionCopy);
              connectionNestedCopy.inputParams = mapRepeatingGroupIndex({
                ruleObject: connectionCopy.inputParams,
                index: childIndex,
                dataModelField: true,
                nested: true,
              });
              connectionNestedCopy.selectedFields = mapRepeatingGroupIndex({
                ruleObject: connectionCopy.selectedFields,
                index: childIndex,
                nested: true,
              });
              runConditionalRenderingRule(connectionNestedCopy, formData, componentsToHide);
            }
          }
        }
        runConditionalRenderingRule(connectionCopy, formData, componentsToHide);
      }
    } else {
      runConditionalRenderingRule(connection, formData, componentsToHide);
    }
  }

  return componentsToHide;
}

interface MapRepeatingGroupIndexParams {
  ruleObject: IParameters | ISelectedFields;
  index: number;
  dataModelField?: boolean;
  nested?: boolean;
}

function mapRepeatingGroupIndex({
  ruleObject,
  index,
  dataModelField = false,
  nested = false,
}: MapRepeatingGroupIndexParams) {
  const result: any = {};
  Object.keys(ruleObject).forEach((key) => {
    const field = ruleObject[key];
    result[key] = field.replace(nested ? '{1}' : '{0}', dataModelField ? `[${index}]` : `-${index}`);
  });
  return result;
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  formData: IFormData | null,
  hiddenFields: Set<string>,
) {
  const functionToRun = rule.selectedFunction;
  const objectToUpdate = window.conditionalRuleHandlerHelper[functionToRun]();

  // Map input object structure to input object defined in the conditional rendering rule connection
  const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
    const selectedParam: string = rule.inputParams[elem];
    acc[elem] = formData ? formData[selectedParam] : null;
    return acc;
  }, {});

  const result = window.conditionalRuleHandlerObject[functionToRun](newObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);
  Object.keys(rule.selectedFields).forEach((elementToPerformActionOn) => {
    if (elementToPerformActionOn && hide) {
      const elementId = rule.selectedFields[elementToPerformActionOn];
      hiddenFields.add(elementId);
    }
  });
}
