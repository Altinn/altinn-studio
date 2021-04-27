import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, put } from 'redux-saga/effects';
import { IInstance } from 'altinn-shared/types';
import { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import { getRulehandlerUrl } from 'src/utils/urlHelper';
import { get } from '../../../../utils/networking';
import { getRuleModelFields } from '../../../../utils/rules';
import Actions from '../rulesActions';
import * as ActionTypes from '../rulesActionTypes';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { IRuntimeState, ILayoutSets } from '../../../../types';
import { getLayoutsetForDataElement } from '../../../../utils/layout';
import { getDataTaskDataTypeId } from '../../../../utils/appMetadata';

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
    const aplicationMetadataState: IApplicationMetadata = yield select(applicationMetadataSelector);
    const dataType: string =
    getDataTaskDataTypeId(instance.process.currentTask.elementId, aplicationMetadataState.dataTypes);
    let layoutSetId: string = null;

    if (layoutSets != null) {
      layoutSetId = getLayoutsetForDataElement(instance, dataType, layoutSets);
    }

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
