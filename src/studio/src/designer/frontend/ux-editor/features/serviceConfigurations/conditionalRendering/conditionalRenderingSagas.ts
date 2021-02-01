import { SagaIterator } from 'redux-saga';
import { put, select, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { IConditionalRenderingState } from '../serviceConfigurationTypes';
import { setConditionalRenderingConnections } from '../serviceConfigurationSlice';
import { saveServiceConfiguration } from '../serviceConfigurationSlice';
import { IUpdateFormComponentIdAction } from '../../formDesigner/formDesignerTypes';
import { FormLayoutActions } from '../../formDesigner/formLayout/formLayoutSlice';

const selectConditionalRuleConnection = (state: IAppState): any => state.serviceConfigurations.conditionalRendering;

export function* updateConditionalRenderingConnectedIdsSaga({ payload }:
  PayloadAction<IUpdateFormComponentIdAction>): SagaIterator {
  try {
    /*
      If a component/container has updated the id this change should be reflected in the conditional rendering rules
    */
    const { currentId, newId } = payload;
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
    FormLayoutActions.updateFormComponentId,
    FormLayoutActions.updateContainerId,
  ], updateConditionalRenderingConnectedIdsSaga);
}
