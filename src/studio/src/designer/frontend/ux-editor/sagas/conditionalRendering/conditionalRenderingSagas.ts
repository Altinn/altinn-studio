import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import * as ConditionalRenderingActions from '../../actions/conditionalRenderingActions/actions';
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

export function* watchDelConditionalRenderingSaga(): SagaIterator {
  yield takeLatest(
    ConditionalRenderingActionTypes.DEL_CONDITIONAL_RENDERING,
    delConditionalRenderingSaga,
  );
}
