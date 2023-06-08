import type { IRuleConnections } from 'src/features/dynamics';
import type { IFormDataState } from 'src/features/formData';
import type { IRuleModelFieldElement } from 'src/features/formRules';
import type { ILayouts } from 'src/layout/layout';

export function checkIfRuleShouldRun(
  ruleConnectionState: IRuleConnections | null,
  formDataState: Partial<IFormDataState>,
  layouts: ILayouts | null,
  lastUpdatedDataBinding: string,
) {
  const rules: any[] = [];
  if (!ruleConnectionState) {
    return rules;
  }
  Object.keys(ruleConnectionState).forEach((connection) => {
    if (!connection) {
      return;
    }
    const connectionDef = ruleConnectionState[connection];
    const functionToRun: string = connectionDef.selectedFunction;
    let shouldRunFunction = false;

    Object.keys(connectionDef.inputParams).forEach((inputParam) => {
      if (!inputParam) {
        return;
      }

      if (connectionDef.inputParams[inputParam] === lastUpdatedDataBinding) {
        shouldRunFunction = true;
      }
    });

    Object.keys(connectionDef.outParams).forEach((outParam) => {
      if (!outParam) {
        shouldRunFunction = false;
      }
    });

    if (shouldRunFunction) {
      const objectToUpdate = window.ruleHandlerHelper[functionToRun]();
      if (Object.keys(objectToUpdate).length >= 1) {
        const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
          const inputParamBinding = connectionDef.inputParams[elem];

          acc[elem] = formDataState.formData && formDataState.formData[inputParamBinding];
          return acc;
        }, {});
        const result = window.ruleHandlerObject[functionToRun](newObj);
        const updatedDataBinding = connectionDef.outParams.outParam0;
        let updatedComponent: string | undefined = undefined;
        Object.keys(layouts || {}).forEach((id) => {
          const layout = (layouts || {})[id] || [];
          layout.forEach((layoutElement) => {
            if (layoutElement.type === 'Group') {
              return;
            }
            let ruleDataBindingKey: string | undefined = undefined;
            if (layoutElement.dataModelBindings) {
              ruleDataBindingKey = Object.keys(layoutElement.dataModelBindings).find(
                (dataBindingKey) =>
                  layoutElement.dataModelBindings &&
                  layoutElement.dataModelBindings[dataBindingKey] === connectionDef.outParams.outParam0,
              );
            }

            if (ruleDataBindingKey) {
              updatedComponent = layoutElement.id;
            }
          });
        });

        if (!updatedDataBinding) {
          // Validation error on field that triggered the check?
        } else if (!updatedComponent) {
          // Validation error on field that triggered the check?
        } else {
          rules.push({
            ruleShouldRun: true,
            dataBindingName: updatedDataBinding,
            componentId: updatedComponent,
            result: result.toString(),
          });
        }
      }
    }
  });
  return rules;
}

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
