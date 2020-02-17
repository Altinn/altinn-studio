import { IFormData } from '../../features/form/data/formDataReducer';
import { IDataModelState } from '../../features/form/datamodel/formDatamodelReducer';
import { IRuleConnections } from '../../features/form/dynamics/';
import { ILayoutComponent } from '../../features/form/layout';
import { ILayoutState } from '../../features/form/layout/formLayoutReducer';
import { IDataModelFieldElement, IRuleModelFieldElement } from '../../features/form/rules';

export function checkIfRuleShouldRun(
  ruleConnectionState: IRuleConnections,
  formDataState: IFormData,
  formDataModelState: IDataModelState,
  formLayoutState: ILayoutState,
  repeatingContainerId: string,
  lastUpdatedDataBinding: IDataModelFieldElement) {
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
  for (const connection in ruleConnectionState) {
    if (!connection) {
      continue;
    }
    const connectionDef = ruleConnectionState[connection];
    const functionToRun: string = connectionDef.selectedFunction;
    let shouldRunFunction = false;
    for (const inputParam in connectionDef.inputParams) {
      if (!inputParam) {
        continue;
      }

      if (connectionDef.inputParams[inputParam] === lastUpdatedDataBinding.dataBindingName) {
        shouldRunFunction = true;
      }
    }
    for (const outParam of Object.keys(connectionDef.outParams)) {
      if (!outParam) {
        shouldRunFunction = false;
      }
    }
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
          (element: IDataModelFieldElement) => element.dataBindingName === connectionDef.outParams.outParam0);
        let updatedComponent: string;
        for (const component in formLayoutState.layout) {
          if (!component) {
            continue;
          }
          const layoutElement = formLayoutState.layout[component];
          if (layoutElement.type.toLowerCase() === 'group') {
            continue;
          }
          const layoutComponent = layoutElement as ILayoutComponent;
          for (const dataBindingKey in layoutComponent.dataModelBindings) {
            if (!dataBindingKey) {
              continue;
            }
            if (layoutComponent.dataModelBindings[dataBindingKey] ===
              connectionDef.outParams.outParam0) {
              updatedComponent = layoutElement.id;
              break;
            }
          }
        }
        if (!updatedDataBinding) {
          // Validation error on field that triggered the check?
        } else {
          if (!updatedComponent) {
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
    }
  }
  return rules;
}

export function getRuleModelFields() {
  const ruleModelFields: IRuleModelFieldElement[] = [];
  for (const functionName of Object.keys((window as any).ruleHandlerObject)) {
    const innerFuncObj = {
      name: functionName,
      inputs: (window as any).ruleHandlerHelper[functionName](),
      type: 'rule',
    };
    ruleModelFields.push(innerFuncObj);
  }
  for (const functionName of Object.keys((window as any).conditionalRuleHandlerObject)) {
    const innerFuncObj = {
      name: functionName,
      inputs: (window as any).conditionalRuleHandlerHelper[functionName](),
      type: 'condition',
    };
    ruleModelFields.push(innerFuncObj);
  }
  return ruleModelFields;
}
