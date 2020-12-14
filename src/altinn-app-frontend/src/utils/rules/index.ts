import { IDataModelFieldElement } from 'src/types';
import { IFormData } from '../../features/form/data/formDataReducer';
import { IDataModelState } from '../../features/form/datamodel/formDatamodelReducer';
import { IRuleConnections } from '../../features/form/dynamics';
import { ILayouts, ILayoutComponent } from '../../features/form/layout';
import { IRuleModelFieldElement } from '../../features/form/rules';

export function checkIfRuleShouldRun(
  ruleConnectionState: IRuleConnections,
  formDataState: IFormData,
  formDataModelState: IDataModelState,
  layouts: ILayouts,
  repeatingContainerId: string,
  lastUpdatedDataBinding: IDataModelFieldElement,
) {
  /*
  let repContainer;
  let repeating;
  let dataModelGroup: string;
  let index;

  if (repeatingContainerId) {
    repContainer = formLayoutState.layout[repeatingContainerId];
    repeating = repContainer.repeating;
    dataModelGroup = repContainer.dataModelGroup;
    index = repContainer.index;
  } */

  /* const isPartOfRepeatingGroup: boolean = (repeating && dataModelGroup != null && index != null);
  const dataModelGroupWithIndex: string = dataModelGroup + `[${index}]`; */
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

      if (connectionDef.inputParams[inputParam] === lastUpdatedDataBinding.dataBindingName) {
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

          acc[elem] = formDataState.formData[inputParamBinding];
          return acc;
        }, {});
        const result = (window as any).ruleHandlerObject[functionToRun](newObj);
        const updatedDataBinding: IDataModelFieldElement = formDataModelState.dataModel.find(
          (element: IDataModelFieldElement) => element.dataBindingName === connectionDef.outParams.outParam0,
        );
        let updatedComponent: string;
        Object.keys(layouts).forEach((id) => {
          const layout = layouts[id];
          layout.forEach((layoutElement) => {
            if (layoutElement.type.toLowerCase() === 'group') {
              return;
            }
            const layoutComponent = layoutElement as ILayoutComponent;
            let ruleDataBindingKey = null;
            if (layoutComponent.dataModelBindings) {
              ruleDataBindingKey = Object.keys(layoutComponent.dataModelBindings).find((dataBindingKey) => {
                return layoutComponent.dataModelBindings[dataBindingKey] ===
                connectionDef.outParams.outParam0;
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
          /* if (isPartOfRepeatingGroup) {
              updatedDataBinding = { ...updatedDataBinding };
              updatedDataBinding.dataBindingName =
                updatedDataBinding.dataBindingName.replace(dataModelGroup, dataModelGroupWithIndex);
            } */
          rules.push({
            ruleShouldRun: true,
            dataBindingName: updatedDataBinding.dataBindingName,
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
