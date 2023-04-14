import { get } from 'app-shared/utils/networking';
import type { SagaIterator } from 'redux-saga';
import { call, fork, put, takeLatest } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchRuleModel,
  fetchRuleModelFulfilled,
  fetchRuleModelRejected,
} from './ruleModel/ruleModelSlice';
import type { IRuleModelFieldElement } from '../../types/global';
import { ruleHandlerPath } from 'app-shared/api-paths';

function* fetchRuleModelSaga({ payload }: PayloadAction<{org, app}>): SagaIterator {
  const { org, app } = payload;
  try {
    const ruleModel = yield call(get, ruleHandlerPath(org, app));
    const ruleModelFields: IRuleModelFieldElement[] = [];
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);

    const {
      ruleHandlerObject,
      conditionalRuleHandlerObject,
      ruleHandlerHelper,
      conditionalRuleHandlerHelper,
    } = window as unknown as {
      ruleHandlerObject: object;
      conditionalRuleHandlerObject: object;
      ruleHandlerHelper: object;
      conditionalRuleHandlerHelper: object;
    };

    Object.keys(ruleHandlerObject).forEach((functionName) => {
      if (typeof ruleHandlerHelper[functionName] === 'function') {
        const innerFuncObj = {
          name: functionName,
          inputs: ruleHandlerHelper[functionName](),
          type: 'rule',
        };
        ruleModelFields.push(innerFuncObj);
      }
    });

    Object.keys(conditionalRuleHandlerObject).forEach((functionName) => {
      if (typeof conditionalRuleHandlerHelper[functionName] === 'function') {
        const innerFuncObj = {
          name: functionName,
          inputs: conditionalRuleHandlerHelper[functionName](),
          type: 'condition',
        };
        ruleModelFields.push(innerFuncObj);
      }
    });

    yield put(fetchRuleModelFulfilled({ ruleModel: ruleModelFields }));
  } catch (error) {
    yield put(fetchRuleModelRejected({ error }));
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(fetchRuleModel, fetchRuleModelSaga);
}

export default function* appDataSagas(): SagaIterator {
  yield fork(watchFetchRuleModelSaga);
}
