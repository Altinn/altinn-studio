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
import { IDataModelState } from '../../../datamodell/reducer';

const selectRuleConnection = (state: IRuntimeState): IFormDynamicState => state.formDynamics.ruleConnection;
const selectFormDataConnection = (state: IRuntimeState): IFormData => state.formData;
const selectFormLayoutConnection = (state: IRuntimeState): ILayoutState => state.formLayout;
const selectFormdataModelConnection = (state: IRuntimeState): IDataModelState => state.formDataModel;

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
    const formDataModelState: IDataModelState = yield select(selectFormdataModelConnection);
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
            let inputParamBinding = connectionDef.inputParams[elem];

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
              yield call(FormDataActions.updateFormData, updatedDataBinding.DataBindingName, result.toString());
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
