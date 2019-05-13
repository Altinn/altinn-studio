import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as RuleActions from '../../actions/rule';
import * as ActionTypes from '../../actions/types';

import { IRuntimeState } from '../../../../../reducers';
import { IFormDynamicState } from '../../../dynamics/reducer';
import { IFormRuleState } from '../../reducer';
import { IFormData } from '../../../data/reducer';
import FormDataActions from '../../../data/actions';
import { IDataModelFieldElement } from '../../';
import { ILayoutState } from '../../../layout/reducer';

const selectRuleConnection = (state: IRuntimeState): IFormDynamicState => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormData => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;

function* checkIfRuleShouldRunSaga({
  lastUpdatedComponentId,
  lastUpdatedDataBinding,
  lastUpdatedDataValue,
  repeatingContainerId,
}: RuleActions.ICheckIfRuleShouldRun): SagaIterator {
  try {
    const ruleConnectionState: IFormRuleState = yield select(selectRuleConnection);
    const formDataState: IFormData = yield select(selectFormDataConnection);
    const formLayoutState: ILayoutState = yield select(selectFormLayoutConnection);
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
      console.log('connection ', connection);
      const connectionDef = ruleConnectionState[connection];
      const functionToRun: string = connectionDef.selectedFunction;
      let shouldRunFunction = false;
      let numberOfInputFieldsFilledIn = 0;
      for (const inputParam in connectionDef.inputParams) {
        if (!inputParam) {
          continue;
        }
        console.log(inputParam);
        let inputParamBinding: string = connectionDef.inputParams[inputParam];
        console.log(formDataState.formData, inputParamBinding);
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
      console.log('should run function? ', shouldRunFunction);
      if (shouldRunFunction) {
        const objectToUpdate = (window as any).ruleHandlerHelper[functionToRun]();
        console.log(Object.keys(objectToUpdate).length === numberOfInputFieldsFilledIn,
          Object.keys(objectToUpdate).length, numberOfInputFieldsFilledIn);
        if (Object.keys(objectToUpdate).length === numberOfInputFieldsFilledIn) {
          const newObj = Object.keys(objectToUpdate).reduce((acc: any, elem: any) => {
            let inputParamBinding = connectionDef.inputParams[elem];

            acc[elem] = formDataState.formData[inputParamBinding];
            return acc;
          }, {});

          const result = (window as any).ruleHandlerObject[functionToRun](newObj);
          let updatedDataBinding: IDataModelFieldElement = formDataState.dataModel.model.find(
            (element: IDataModelFieldElement) => element.DataBindingName === connectionDef.outParams.outParam0);
          let updatedComponent: string;
          console.log(formLayoutState.layout);
          for (const component in formLayoutState.layout) {
            if (!component) {
              continue;
            }
            console.log('component 2 ', component);
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
              console.log('do you come to this? ',
                updatedComponent, result, updatedDataBinding, updatedDataBinding.DataBindingName);
              yield call(
                FormDataActions.updateFormData,
                updatedComponent, result, updatedDataBinding, updatedDataBinding.DataBindingName);
            }
          }
        }
      }
    }
  } catch (err) {
    yield call(
      console.error,
      'Oh noes',
      err,
    );
  }
}

export function* watchCheckIfRuleShouldRunSaga(): SagaIterator {
  yield takeLatest(ActionTypes.CHECK_IF_RULE_SHOULD_RUN, checkIfRuleShouldRunSaga);
}
