import { IAltinnWindow, IRepeatingGroup, IRepeatingGroups } from 'src/types';
import { IFormData } from '../features/form/data/formDataReducer';
import { IConditionalRenderingRule, IConditionalRenderingRules, IParameters, ISelectedFields } from '../features/form/dynamics/types';

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

  if (!rules || Object.keys(rules).length === 0) {
    return componentsToHide;
  }

  Object.keys(rules).forEach((key) => {
    if (!key) {
      return;
    }

    const connection: IConditionalRenderingRule = rules[key];
    if (connection.repeatingGroup) {
      const connectionCopy: IConditionalRenderingRule = JSON.parse(JSON.stringify(connection));
      mapRepeatingGroupIndex(repeatingGroups, connectionCopy.inputParams, connection.repeatingGroup?.groupId, true);
      mapRepeatingGroupIndex(repeatingGroups, connectionCopy.selectedFields, connection.repeatingGroup?.groupId, false);
      componentsToHide = componentsToHide.concat(runConditionalRenderingRule(connectionCopy, formData));
    } else {
      componentsToHide = componentsToHide.concat(runConditionalRenderingRule(connection, formData));
    }
  });

  return componentsToHide;
}

function mapRepeatingGroupIndex(
  repeatingGroups: IRepeatingGroups,
  ruleObject: IParameters | ISelectedFields,
  repeatingGroupId: string,
  dataModelField?: boolean,
) {
  if (!dataModelField && !repeatingGroupId) return;
  let groupId;
  Object.keys(ruleObject).forEach((key) => {
    const field = ruleObject[key];
    if (field.indexOf('{0}') > -1) {
      groupId = repeatingGroupId || field.substr(0, field.indexOf('{'));
      const repeatingGroup: IRepeatingGroup = repeatingGroups[groupId];
      if (!repeatingGroup) return;
      for (let i = 0; i <= repeatingGroup.count; ++i) {
        // eslint-disable-next-line no-param-reassign
        ruleObject[key] = field.replace('{0}', dataModelField ? `[${i}]` : `-${i}`);
      }
    }
  });
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
