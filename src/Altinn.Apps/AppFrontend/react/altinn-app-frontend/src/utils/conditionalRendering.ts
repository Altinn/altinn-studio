import { IAltinnWindow, IRepeatingGroup, IRepeatingGroups } from 'src/types';
import { IFormData } from '../features/form/data/formDataReducer';
import { IConditionalRenderingRule, IConditionalRenderingRules } from '../features/form/dynamics/types';

/*
* Runs conditional rendering rules, returns array of affected layout elements
*/
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules,
  formData: IFormData,
  repeatingGroups?: IRepeatingGroups,
): any[] {
  let componentsToHide: string[] = [];
  if (!(window as Window as IAltinnWindow).conditionalRuleHandlerHelper) {
    // rules have not been initialized
    return componentsToHide;
  }

  Object.keys(rules).forEach((key) => {
    if (!key) {
      return;
    }

    const connection: IConditionalRenderingRule = rules[key];
    if (connection.repeatingGroup) {
      const repeatingGroup: IRepeatingGroup = repeatingGroups[connection.repeatingGroup.groupId];
      for (let i = 0; i <= repeatingGroup.count; ++i) {
        const repeatingGroupConnection: IConditionalRenderingRule = JSON.parse(JSON.stringify(connection));
        Object.keys(repeatingGroupConnection.inputParams).forEach((inputParamKey) => {
          const field = repeatingGroupConnection.inputParams[inputParamKey];
          if (field.startsWith(connection.repeatingGroup.dataModelBinding)) {
            repeatingGroupConnection.inputParams[inputParamKey] =
              field.replace(connection.repeatingGroup.dataModelBinding, `${connection.repeatingGroup.dataModelBinding}[${i}]`);
          }
        });
        Object.keys(repeatingGroupConnection.selectedFields).forEach((fieldKey) => {
          repeatingGroupConnection.selectedFields[fieldKey] += `-${i}`;
        });
        componentsToHide = componentsToHide.concat(runConditionalRenderingRule(repeatingGroupConnection, formData));
      }
    } else {
      componentsToHide = componentsToHide.concat(runConditionalRenderingRule(connection, formData));
    }
  });

  return componentsToHide;
}

function runConditionalRenderingRule(rule: IConditionalRenderingRule, formData: IFormData) {
  const functionToRun = rule.selectedFunction;
  const componentsToHide: string[] = [];
  const objectToUpdate = (window as Window as IAltinnWindow).conditionalRuleHandlerHelper[functionToRun]();

  // Map input object structure to input object defined in the conditional rendering rule connection
  const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
    const selectedParam: string = rule.inputParams[elem];
    acc[elem] = formData ? formData[selectedParam] : null;
    return acc;
  }, {});

  const result = (window as any).conditionalRuleHandlerObject[functionToRun](newObj);
  const action = rule.selectedAction;
  const hide = (action === 'Show' && !result) || (action === 'Hide' && result);
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
