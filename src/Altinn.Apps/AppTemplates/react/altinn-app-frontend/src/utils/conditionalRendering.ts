import { IAltinnWindow } from 'src/types';
import { IFormData } from '../features/form/data/formDataReducer';
import { IConditionalRenderingRule, IConditionalRenderingRules } from '../features/form/dynamics/types';

/*
* Runs conditional rendering rules, returns array of affected layout elements
*/
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules,
  formData: IFormData,
): any[] {
  const componentsToHide: string[] = [];
  if (!(window as Window as IAltinnWindow).conditionalRuleHandlerHelper) {
    // rules have not been initialized
    return componentsToHide;
  }

  for (const key in rules) {
    if (!key) {
      continue;
    }
    const connection: IConditionalRenderingRule = rules[key];
    const functionToRun = connection.selectedFunction;
    const objectToUpdate = (window as Window as IAltinnWindow).conditionalRuleHandlerHelper[functionToRun]();
    // Map input object structure to input object defined in the conditional rendering rule connection
    const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
      const selectedParam: string = connection.inputParams[elem];
      acc[elem] = formData ? formData[selectedParam] : null;
      return acc;
    }, {});
    const result = (window as any).conditionalRuleHandlerObject[functionToRun](newObj);
    const action = connection.selectedAction;
    const hide = (action === 'Show' && !result) || (action === 'Hide' && result);
    for (const elementToPerformActionOn in connection.selectedFields) {
      // tslint:disable-next-line:curly
      if (!elementToPerformActionOn || !hide) continue;

      const elementId = connection.selectedFields[elementToPerformActionOn];
      addElementToList(componentsToHide, elementId);
    }
  }

  return componentsToHide;
}

function addElementToList(list: string[], elementToAdd: string) {
  if (list.findIndex((element) => element === elementToAdd) === -1) {
    list.push(elementToAdd);
  }
}
