import type { IRuleModelFieldElement } from 'src/features/form/rules';

export function getRuleModelFields() {
  const ruleModelFields: IRuleModelFieldElement[] = [];
  if (!window.ruleHandlerObject || !window.conditionalRuleHandlerObject) {
    return ruleModelFields;
  }

  Object.keys(window.ruleHandlerObject).forEach((functionName) => {
    const innerFuncObj = {
      name: functionName,
      inputs: window.ruleHandlerHelper[functionName](),
      type: 'rule',
    };
    ruleModelFields.push(innerFuncObj);
  });

  Object.keys(window.conditionalRuleHandlerObject).forEach((functionName) => {
    const innerFuncObj = {
      name: functionName,
      inputs: window.conditionalRuleHandlerHelper[functionName](),
      type: 'condition',
    };
    ruleModelFields.push(innerFuncObj);
  });

  return ruleModelFields;
}
