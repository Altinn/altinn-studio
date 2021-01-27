import { SagaIterator } from 'redux-saga';
import { put, select, takeLatest } from 'redux-saga/effects';
import { IConditionalRenderingState } from '../serviceConfigurationTypes';
import * as FormDesignerActionType from '../../../actions/formDesignerActions/formDesignerActionTypes';
import * as FormDesignerActions from '../../../actions/formDesignerActions/actions';
import { setConditionalRenderingConnections } from '../serviceConfigurationSlice';
import { saveServiceConfiguration } from '../serviceConfigurationSlice';

const selectConditionalRuleConnection = (state: IAppState): any => state.serviceConfigurations.conditionalRendering;

export function* updateConditionalRenderingConnectedIdsSaga({ currentId, newId }:
  FormDesignerActions.IUpdateFormComponentIdFulfilledAction | FormDesignerActions.IUpdateContainerIdFulfilled)
  : SagaIterator {
  try {
    /*
      If a component/container has updated the id this change should be reflected in the conditional rendering rules
    */
    const conditionalRenderingState: IConditionalRenderingState = yield select(selectConditionalRuleConnection);
    let updated: boolean = false;
    Object.keys(conditionalRenderingState).forEach((id: string) => {
      Object.keys(conditionalRenderingState[id]?.selectedFields).forEach((fieldId: string) => {
        if (conditionalRenderingState[id].selectedFields[fieldId] === currentId) {
          updated = true;
          conditionalRenderingState[id].selectedFields[fieldId] = newId;
        }
      });
    });

    if (updated) {
      yield put(setConditionalRenderingConnections({ conditionalRenderingConnections: conditionalRenderingState }));
      yield put(saveServiceConfiguration());
    }
  } catch (err) {
    console.error(err);
  }
}

export function* watchUpdateConditionalRenderingConnectedIdsSaga(): SagaIterator {
  yield takeLatest([
    FormDesignerActionType.UPDATE_FORM_COMPONENT_ID_FULFILLED,
    FormDesignerActionType.UPDATE_CONTAINER_ID_FULFILLED,
  ], updateConditionalRenderingConnectedIdsSaga);
}
