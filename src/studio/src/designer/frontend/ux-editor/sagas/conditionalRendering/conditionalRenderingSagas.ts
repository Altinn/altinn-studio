import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import { IConditionalRenderingState } from '../../reducers/conditionalRenderingReducer';
import * as ConditionalRenderingActions from '../../actions/conditionalRenderingActions/actions';
import * as FormDesignerActionType from '../../actions/formDesignerActions/formDesignerActionTypes';
import * as FormDesignerActions from '../../actions/formDesignerActions/actions';
// eslint-disable-next-line max-len
import ConditionalRenderingActionDispatcher from '../../actions/conditionalRenderingActions/conditionalRenderingActionDispatcher';
// eslint-disable-next-line max-len
import * as ConditionalRenderingActionTypes from '../../actions/conditionalRenderingActions/conditionalRenderingActionTypes';
import manageServiceConfigurationActionDispatchers from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import { getSaveServiceConfigurationUrl } from '../../utils/urlHelper';

const selectConditionalRuleConnection = (state: IAppState): any => state.serviceConfigurations.conditionalRendering;

function* addConditionalRenderingSaga({ newConnection }:
  ConditionalRenderingActions.IAddConditionalRendering): SagaIterator {
  try {
    yield call(ConditionalRenderingActionDispatcher.addConditionalRenderingFulfilled, newConnection);
    yield call(manageServiceConfigurationActionDispatchers.saveJsonFile, getSaveServiceConfigurationUrl());
  } catch (err) {
    yield call(ConditionalRenderingActionDispatcher.addConditionalRenderingRejected, err);
  }
}

export function* watchAddConditionalRenderingSaga(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.ADD_CONDITIONAL_RENDERING,
    addConditionalRenderingSaga,
  );
}

function* delConditionalRenderingSaga({ connectionId }:
  ConditionalRenderingActions.IDelConditionalRendering): SagaIterator {
  try {
    // get state
    const conditionalRenderingState: any = yield select(selectConditionalRuleConnection);

    // create array
    const conditionalRenderingArray = Object.keys(conditionalRenderingState);

    // filter out the "connecitonID" to delete
    const newConnectionsArray = conditionalRenderingArray.filter(
      (conditionalRendringCon: any) => conditionalRendringCon !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionObj = newConnectionsArray.reduce((acc: any, conditionalRendringCon: any) => {
      acc[conditionalRendringCon] = conditionalRenderingState[conditionalRendringCon];
      return acc;
    }, {});

    yield call(ConditionalRenderingActionDispatcher.delConditionalRenderingFulfilled, newConnectionObj);
    yield call(manageServiceConfigurationActionDispatchers.saveJsonFile, getSaveServiceConfigurationUrl());
  } catch (err) {
    yield call(ConditionalRenderingActionDispatcher.delConditionalRenderingRejected, err);
  }
}

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
      yield call(ConditionalRenderingActionDispatcher.delConditionalRenderingFulfilled, conditionalRenderingState);
      yield call(manageServiceConfigurationActionDispatchers.saveJsonFile, getSaveServiceConfigurationUrl());
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

export function* watchDelConditionalRenderingSaga(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.DEL_CONDITIONAL_RENDERING,
    delConditionalRenderingSaga,
  );
}
