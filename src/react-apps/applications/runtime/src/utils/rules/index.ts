import { IFormData } from '../../features/form/data/reducer';
import { IDataModelState } from '../../features/form/datamodell/reducer';
import { IRuleConnections } from '../../features/form/dynamics/';
import { ILayoutComponent } from '../../features/form/layout';
import { ILayoutState } from '../../features/form/layout/reducer';
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
  for (const connection in ruleConnectionState) {
    if (!connection) {
      continue;
    }
    const connectionDef = ruleConnectionState[connection];
    const functionToRun: string = connectionDef.selectedFunction;
    let shouldRunFunction = false;
    let numberOfInputFieldsFilledIn = 0;
    for (const inputParam in connectionDef.inputParams) {
      if (!inputParam) {
        continue;
      }
      const inputParamBinding: string = connectionDef.inputParams[inputParam];
      /* if (isPartOfRepeatingGroup) {
        inputParamBinding = inputParamBinding.replace(dataModelGroup, dataModelGroupWithIndex);
      } */
      if (formDataState.formData[inputParamBinding]) {
        numberOfInputFieldsFilledIn++;
      }
      if (connectionDef.inputParams[inputParam] === lastUpdatedDataBinding.DataBindingName) {
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
      if (Object.keys(objectToUpdate).length === numberOfInputFieldsFilledIn) {
        const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
          const inputParamBinding = connectionDef.inputParams[elem];

          acc[elem] = formDataState.formData[inputParamBinding];
          return acc;
        }, {});
        const result = (window as any).ruleHandlerObject[functionToRun](newObj);
        const updatedDataBinding: IDataModelFieldElement = formDataModelState.dataModel.find(
          (element: IDataModelFieldElement) => element.DataBindingName === connectionDef.outParams.outParam0);
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
              updatedComponent = component;
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
              updatedDataBinding.DataBindingName =
                updatedDataBinding.DataBindingName.replace(dataModelGroup, dataModelGroupWithIndex);
            } */
            return {
              ruleShouldRun: true,
              dataBindingName: updatedDataBinding.DataBindingName,
              result: result.toString(),
            };
          }
        }
      }
    }
  }
  return {
    ruleShouldRun: false,
    dataBindingName: null,
    result: null,
  };
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
