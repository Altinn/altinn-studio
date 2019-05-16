import { IFormData } from '../../features/form/data/reducer';
import { IDataModelState } from '../../features/form/datamodell/reducer';
import { IRuleConnection } from '../../features/form/dynamics/';
import { ILayoutState } from '../../features/form/layout/reducer';
import { IDataModelFieldElement } from '../../features/form/rules';

export function checkIfRuleShouldRun(
  ruleConnectionState: IRuleConnection,
  formDataState: IFormData,
  formDataModelState: IDataModelState,
  formLayoutState: ILayoutState,
  repeatingContainerId: string,
  lastUpdatedDataBinding: IDataModelFieldElement) {
  let repContainer;
  let repeating;
  let dataModelGroup: string;
  let index;
  if (repeatingContainerId) {
    repContainer = formLayoutState.layout[repeatingContainerId];
    repeating = repContainer.repeating;
    dataModelGroup = repContainer.dataModelGroup;
    index = repContainer.index;
  }

  const isPartOfRepeatingGroup: boolean = (repeating && dataModelGroup != null && index != null);
  const dataModelGroupWithIndex: string = dataModelGroup + `[${index}]`;
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
      let inputParamBinding: string = connectionDef.inputParams[inputParam];
      if (isPartOfRepeatingGroup) {
        inputParamBinding = inputParamBinding.replace(dataModelGroup, dataModelGroupWithIndex);
      }
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
        let updatedDataBinding: IDataModelFieldElement = formDataModelState.dataModel.find(
          (element: IDataModelFieldElement) => element.DataBindingName === connectionDef.outParams.outParam0);
        let updatedComponent: string;
        for (const component in formLayoutState.layout) {
          if (!component) {
            continue;
          }
          /* there is no order??
           if (isPartOfRepeatingGroup) {
            if (Object.keys(order[repeatingContainerId]).indexOf(component) !== -1) {
              continue;
            }
          } */
          for (const dataBindingKey in formLayoutState.layout[component].dataModelBindings) {
            if (!dataBindingKey) {
              continue;
            }
            if (formLayoutState.layout[component].dataModelBindings[dataBindingKey] ===
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
            if (isPartOfRepeatingGroup) {
              updatedDataBinding = { ...updatedDataBinding };
              updatedDataBinding.DataBindingName =
                updatedDataBinding.DataBindingName.replace(dataModelGroup, dataModelGroupWithIndex);
            }
            return {
              ruleShouldRun: true,
              dataBindingName: updatedDataBinding.DataBindingName,
              result: result.toString(),
            };
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
  return {
    ruleShouldRun: false,
    dataBindingName: null,
    result: null,
  };
}
