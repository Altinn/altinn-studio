import { SagaIterator } from 'redux-saga';
import { call,
  select,
  takeLatest,
  all,
  take } from 'redux-saga/effects';
import { get, getCurrentTaskDataElementId } from 'altinn-shared/utils';
import { IInstance } from 'altinn-shared/types';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import FormActions from '../formDataActions';
import * as FormDataActionTypes from '../formDataActionTypes';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { FETCH_DATA_MODEL_FULFILLED, FETCH_JSON_SCHEMA_FULFILLED } from '../../datamodel/fetch/fetchFormDatamodelActionTypes';
import FormRulesActions from '../../rules/rulesActions';
import FormDynamicsActions from '../../dynamics/formDynamicsActions';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { GET_INSTANCEDATA_FULFILLED } from '../../../../shared/resources/instanceData/get/getInstanceDataActionTypes';
import { IProcessState } from '../../../../shared/resources/process/processReducer';
import { getFetchFormDataUrl, getFetchFormDynamicsUrl, getFetchRuleModelUrl } from '../../../../utils/urlHelper';

const appMetaDataSelector =
  (state: IRuntimeState): IApplicationMetadata => state.applicationMetadata.applicationMetadata;
const instanceDataSelector = (state: IRuntimeState): IInstance => state.instanceData.instance;
const processStateSelector = (state: IRuntimeState): IProcessState => state.process;

function* fetchFormDataSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);

    const currentTaskDataElementId = getCurrentTaskDataElementId(applicationMetadata, instance);
    const fetchedData: any = yield call(get, getFetchFormDataUrl(instance.id, currentTaskDataElementId));
    const parsedLayout = convertModelToDataBinding(fetchedData);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActionTypes.FETCH_FORM_DATA, fetchFormDataSaga);
}

function* fetchFormDataInitialSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);

    const currentTaskDataId = getCurrentTaskDataElementId(applicationMetadata, instance);
    const fetchedData: any = yield call(get, getFetchFormDataUrl(instance.id, currentTaskDataId));

    const parsedLayout = convertModelToDataBinding(fetchedData);
    yield call(FormActions.fetchFormDataFulfilled, parsedLayout);

    yield call(
      FormRulesActions.fetchRuleModel,
      getFetchRuleModelUrl(),
    );

    yield call(
      FormDynamicsActions.fetchFormDynamics,
      getFetchFormDynamicsUrl(),
    );
  } catch (err) {
    yield call(FormActions.fetchFormDataRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormDataInitialSaga(): SagaIterator {
  while (true) {
    yield take(FormDataActionTypes.FETCH_FORM_DATA_INITIAL);
    const processState: IProcessState = yield select(processStateSelector);
    const instance: IInstance = yield select(instanceDataSelector);
    if (!processState || !instance || processState.taskId !== instance.process.currentTask.elementId) {
      yield all([
        take(GET_INSTANCEDATA_FULFILLED),
        take(FETCH_DATA_MODEL_FULFILLED),
        take(FETCH_JSON_SCHEMA_FULFILLED),
      ]);
    } else {
      yield all([
        take(FETCH_DATA_MODEL_FULFILLED),
        take(FETCH_JSON_SCHEMA_FULFILLED),
      ]);
    }
    yield call(fetchFormDataInitialSaga);
  }
}
