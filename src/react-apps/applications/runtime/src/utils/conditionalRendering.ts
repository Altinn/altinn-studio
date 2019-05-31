import { IFormData } from '../features/form/data/reducer';
import { IConditionalRenderingRule, IConditionalRenderingRules } from '../features/form/dynamics/types';
import { ILayout } from '../features/form/layout/';
import { IAltinnWindow } from '../types/global';
import { getLayoutElementById, getLayoutElementIndexById } from './formLayout';

/*
* Runs conditional rendering rules, returns array of affected layout elements
*/
export function runConditionalRenderingRules(
  rules: IConditionalRenderingRules,
  formData: IFormData,
  formLayout: ILayout,
): any[] {
  const updatedElements: any[] = [];
  if (!(window as IAltinnWindow).conditionalRuleHandlerHelper) {
    // rules have not been initialized
    return updatedElements;
  }
  for (const key in rules) {
    if (!key) {
      continue;
    }
    const connection: IConditionalRenderingRule = rules[key];
    const functionToRun = connection.selectedFunction;
    const objectToUpdate = (window as IAltinnWindow).conditionalRuleHandlerHelper[functionToRun]();
    // Map input object structure to input object defined in the conditional rendering rule connection
    const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
      const selectedParam: string = connection.inputParams[elem];
      acc[elem] = formData ? formData[selectedParam] : null;
      return acc;
    }, {});
    const result = (window as any).conditionalRuleHandlerObject[functionToRun](newObj);
    const action = connection.selectedAction;
    for (const elementToPerformActionOn in connection.selectedFields) {
      // tslint:disable-next-line:curly
      if (!elementToPerformActionOn) continue;

      const elementId = connection.selectedFields[elementToPerformActionOn];
      let layoutElement = getLayoutElementById(elementId, formLayout);
      const index = getLayoutElementIndexById(elementId, formLayout);
      if (!layoutElement || index < 0) {
        continue;
      }
      layoutElement = JSON.parse(JSON.stringify(layoutElement));

      switch (action) {
        case 'Show':
          layoutElement.hidden = !result;
          break;
        case 'Hide':
          layoutElement.hidden = result;
          break;
      }
      updatedElements.push(layoutElement);
    }
  }
  return updatedElements;
}
