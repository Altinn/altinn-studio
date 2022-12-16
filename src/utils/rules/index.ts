import type { IFormDataState } from 'src/features/form/data';
import type { IRuleConnections } from 'src/features/form/dynamics';
import type { IRuleModelFieldElement } from 'src/features/form/rules';
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
      const objectToUpdate = (window as any).ruleHandlerHelper[functionToRun]();
      if (Object.keys(objectToUpdate).length >= 1) {
        const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
          const inputParamBinding = connectionDef.inputParams[elem];

          acc[elem] = formDataState.formData && formDataState.formData[inputParamBinding];
          return acc;
        }, {});
        const result = (window as any).ruleHandlerObject[functionToRun](newObj);
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
              ruleDataBindingKey = Object.keys(layoutElement.dataModelBindings).find((dataBindingKey) => {
                return (
                  layoutElement.dataModelBindings &&
                  layoutElement.dataModelBindings[dataBindingKey] === connectionDef.outParams.outParam0
                );
              });
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
  const windowObj = window as any;
  if (!windowObj.ruleHandlerObject || !windowObj.conditionalRuleHandlerObject) {
    return ruleModelFields;
  }

  Object.keys(windowObj.ruleHandlerObject).forEach((functionName) => {
    const innerFuncObj = {
      name: functionName,
      inputs: (window as any).ruleHandlerHelper[functionName](),
      type: 'rule',
    };
    ruleModelFields.push(innerFuncObj);
  });

  Object.keys(windowObj.conditionalRuleHandlerObject).forEach((functionName) => {
    const innerFuncObj = {
      name: functionName,
      inputs: (window as any).conditionalRuleHandlerHelper[functionName](),
      type: 'condition',
    };
    ruleModelFields.push(innerFuncObj);
  });

  return ruleModelFields;
}
