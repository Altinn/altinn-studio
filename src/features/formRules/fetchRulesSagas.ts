import { call, put, select } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormRulesActions } from 'src/features/formRules/rulesSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { getLayoutSetIdForApplication } from 'src/utils/appMetadata';
import { httpGet } from 'src/utils/network/networking';
import { getRuleModelFields } from 'src/utils/rules';
import { getRulehandlerUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ILayoutSets, IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';

const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

/**
 * Saga to retrive the rule configuration defining which rules to run for a given UI
 */
export function* fetchRuleModelSaga(): SagaIterator {
  try {
    const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
    const instance: IInstance = yield select(instanceSelector);
    const application: IApplicationMetadata = yield select(applicationMetadataSelector);
    const layoutSetId = getLayoutSetIdForApplication(application, instance, layoutSets);

    const ruleModel = yield call(httpGet, getRulehandlerUrl(layoutSetId));
    const scriptEle = window.document.createElement('script');
    scriptEle.innerHTML = ruleModel;
    window.document.body.appendChild(scriptEle);
    const ruleModelFields = getRuleModelFields();

    yield put(FormRulesActions.fetchFulfilled({ ruleModel: ruleModelFields }));
  } catch (error) {
    if (error.message?.includes('404')) {
      yield put(FormRulesActions.fetchRejected({ error: null }));
      window.logInfo('RuleHandler not found:\n', error);
    } else {
      yield put(FormRulesActions.fetchRejected({ error }));
      yield put(QueueActions.dataTaskQueueError({ error }));
      window.logError('Fetching RuleHandler failed:\n', error);
    }
  }
}
