import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, put } from 'redux-saga/effects';
import { IInstance } from 'altinn-shared/types';
import { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import { getRulehandlerUrl } from 'src/utils/urlHelper2';
import { get } from '../../../../utils/networking';
import { getRuleModelFields } from '../../../../utils/rules';
import Actions from '../rulesActions';
import * as ActionTypes from '../rulesActionTypes';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { IRuntimeState, ILayoutSets } from '../../../../types';
import { getLayoutSetIdForApplication } from '../../../../utils/appMetadata';

const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

/**
 * Saga to retrive the rule configuration defining which rules to run for a given UI
 */
function* fetchRuleModelSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const application: IApplicationMetadata = yield select(applicationMetadataSelector);
    const layoutSetId = getLayoutSetIdForApplication(application, instance, layoutSets);

    const ruleModel = yield call(get, getRulehandlerUrl(layoutSetId));
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
    const ruleModelFields = getRuleModelFields();

    yield call(
      Actions.fetchRuleModelFulfilled,
      ruleModelFields,
    );
  } catch (error) {
    yield call(Actions.fetchRuleModelRejected, error);
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchRuleModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_RULE_MODEL, fetchRuleModelSaga);
}
