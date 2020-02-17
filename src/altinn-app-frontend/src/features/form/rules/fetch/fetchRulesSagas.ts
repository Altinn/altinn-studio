import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { getRuleModelFields } from '../../../../utils/rules';
import Actions from '../rulesActions';
import * as FetchActions from './fetchRulesActions';
import * as ActionTypes from '../rulesActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';

function* fetchRuleModelSaga({
  url,
}: FetchActions.IFetchRuleModel): SagaIterator {
  try {
    const ruleModel = yield call(get, url);
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
    const ruleModelFields = getRuleModelFields();

    yield call(
      Actions.fetchRuleModelFulfilled,
      ruleModelFields,
    );
  } catch (err) {
    yield call(Actions.fetchRuleModelRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_RULE_MODEL, fetchRuleModelSaga);
}
