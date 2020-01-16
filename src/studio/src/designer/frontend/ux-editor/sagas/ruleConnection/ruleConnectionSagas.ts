import { SagaIterator } from 'redux-saga';
import { call, select, takeLatest } from 'redux-saga/effects';
import manageServiceConfigurationActionDispatcher from '../../actions/manageServiceConfigurationActions/manageServiceConfigurationActionDispatcher';
import * as RuleConnetionActions from '../../actions/ruleConnectionActions/actions';
import RuleConnectionActionDispatchers from '../../actions/ruleConnectionActions/ruleConnectionActionDispatcher';
import * as RuleConnectionActionTypes from '../../actions/ruleConnectionActions/ruleConnectionActionTypes';
import { IRuleConnectionState } from '../../reducers/ruleConnectionReducer';
import { getSaveServiceConfigurationUrl } from '../../utils/urlHelper';

const selectRuleConnection = (state: IAppState): IRuleConnectionState => state.serviceConfigurations.ruleConnection;

function* addRuleConnectionSaga({ newConnection }: RuleConnetionActions.IAddRuleConnection): SagaIterator {
  try {
    yield call(RuleConnectionActionDispatchers.addRuleConnectionFulfilled, newConnection);
    yield call(manageServiceConfigurationActionDispatcher.saveJsonFile, getSaveServiceConfigurationUrl());
  } catch (err) {
    yield call(RuleConnectionActionDispatchers.addRuleConnectionRejected, err);
  }
}

export function* watchAddRuleConnectionSaga(): SagaIterator {
  yield takeLatest(
    RuleConnectionActionTypes.ADD_RULE_CONNECTION,
    addRuleConnectionSaga,
  );
}

function* delRuleConnectionSaga({ connectionId }: RuleConnetionActions.IDelRuleConnection): SagaIterator {
  try {
    // get state
    const ruleConnectionState: IRuleConnectionState = yield select(selectRuleConnection);

    // create array
    const ruleConnectionArray = Object.keys(ruleConnectionState);

    // filter out the "connectionID" to delete
    const newConnectionsArray = ruleConnectionArray.filter((ruleConnection: any) => ruleConnection !== connectionId);

    // create new object with newConnectionsArray content
    const newConnectionObj = newConnectionsArray.reduce((acc: any, ruleConnection: any) => {
      acc[ruleConnection] = ruleConnectionState[ruleConnection];
      return acc;
    }, {});

    yield call(RuleConnectionActionDispatchers.delRuleConnectionFulfilled, newConnectionObj);
    yield call(manageServiceConfigurationActionDispatcher.saveJsonFile, getSaveServiceConfigurationUrl());
  } catch (err) {
    yield call(RuleConnectionActionDispatchers.delRuleConnectionRejected, err);
  }
}

export function* watchDelRuleConnectionSaga(): SagaIterator {
  yield takeLatest(
    RuleConnectionActionTypes.DEL_RULE_CONNECTION,
    delRuleConnectionSaga,
  );
}
