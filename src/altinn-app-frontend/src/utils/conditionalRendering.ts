import type {
  IAltinnWindow,
  IRepeatingGroup,
  IRepeatingGroups,
} from "src/types";
import type { IFormData } from "../features/form/data/formDataReducer";
import type {
  IConditionalRenderingRule,
  IConditionalRenderingRules,
  IParameters,
  ISelectedFields,
} from "../features/form/dynamics/types";

/*
 * Runs conditional rendering rules, returns array of affected layout elements
 */
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules,
  formData: IFormData,
  repeatingGroups?: IRepeatingGroups
): any[] {
  let componentsToHide: string[] = [];
  if (!(window as Window as IAltinnWindow).conditionalRuleHandlerHelper) {
    // rules have not been initialized
    return componentsToHide;
  }

  if (!rules || Object.keys(rules).length === 0) {
    return componentsToHide;
  }

  Object.keys(rules).forEach((key) => {
    if (!key) {
      return;
    }

    const connection: IConditionalRenderingRule = rules[key];
    if (connection.repeatingGroup) {
      const repeatingGroup: IRepeatingGroup =
        repeatingGroups[connection.repeatingGroup.groupId];
      if (!repeatingGroup) {
        return;
      }

      for (let index = 0; index <= repeatingGroup.index; index++) {
        const connectionCopy: IConditionalRenderingRule = JSON.parse(
          JSON.stringify(connection)
        );
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
          const childGroup: IRepeatingGroup =
            repeatingGroups[
              connection.repeatingGroup.childGroupId + "-" + index
            ];
          for (
            let childIndex = 0;
            childIndex <= childGroup?.index;
            childIndex++
          ) {
            const connectionNestedCopy: IConditionalRenderingRule = JSON.parse(
              JSON.stringify(connectionCopy)
            );
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
            componentsToHide = componentsToHide.concat(
              runConditionalRenderingRule(connectionNestedCopy, formData)
            );
          }
        }
        componentsToHide = componentsToHide.concat(
          runConditionalRenderingRule(connectionCopy, formData)
        );
      }
    } else {
      componentsToHide = componentsToHide.concat(
        runConditionalRenderingRule(connection, formData)
      );
    }
  });

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
    result[key] = field.replace(
      nested ? "{1}" : "{0}",
      dataModelField ? `[${index}]` : `-${index}`
    );
  });
  return result;
}

function runConditionalRenderingRule(
  rule: IConditionalRenderingRule,
  formData: IFormData
) {
  const functionToRun = rule.selectedFunction;
  const componentsToHide: string[] = [];
  const objectToUpdate = (
    window as Window as IAltinnWindow
  ).conditionalRuleHandlerHelper[functionToRun]();

  // Map input object structure to input object defined in the conditional rendering rule connection
  const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
    const selectedParam: string = rule.inputParams[elem];
    acc[elem] = formData ? formData[selectedParam] : null;
    return acc;
  }, {});

  const result = (window as any).conditionalRuleHandlerObject[functionToRun](
    newObj
  );
  const action = rule.selectedAction;
  const hide = (action === "Show" && !result) || (action === "Hide" && result);
  Object.keys(rule.selectedFields).forEach((elementToPerformActionOn) => {
    if (elementToPerformActionOn && hide) {
      const elementId = rule.selectedFields[elementToPerformActionOn];
      addElementToList(componentsToHide, elementId);
    }
  });

  return componentsToHide;
}

function addElementToList(list: string[], elementToAdd: string) {
  if (list.findIndex((element) => element === elementToAdd) === -1) {
    list.push(elementToAdd);
  }
}
