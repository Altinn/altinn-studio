import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { IRuleModelFieldElement } from '../../';
import { get } from '../../../../../utils/networking';
import Actions from '../../actions';
import * as FetchActions from '../../actions/fetch';
import * as ActionTypes from '../../actions/types';

function* fetchRuleModelSaga({
  url,
}: FetchActions.IFetchRuleModel): SagaIterator {
  try {
    const ruleModel = yield call(get, url);
    const ruleModelFields: IRuleModelFieldElement[] = [];
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
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
    yield call(
      Actions.fetchRuleModelFulfilled,
      ruleModelFields,
    );
  } catch (err) {
    yield call(Actions.fetchRuleModelRejected, err);
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_RULE_MODEL, fetchRuleModelSaga);
}
