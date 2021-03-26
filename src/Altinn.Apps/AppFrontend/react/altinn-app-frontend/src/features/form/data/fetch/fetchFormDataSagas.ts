import { SagaIterator } from 'redux-saga';
import { call,
  select,
  takeLatest,
  all,
  take,
  put } from 'redux-saga/effects';
import { get, getCurrentTaskDataElementId } from 'altinn-shared/utils';
import { IInstance } from 'altinn-shared/types';
import { convertModelToDataBinding } from '../../../../utils/databindings';
import FormDataActions from '../formDataActions';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import FormRulesActions from '../../rules/rulesActions';
import FormDynamicsActions from '../../dynamics/formDynamicsActions';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { GET_INSTANCEDATA_FULFILLED } from '../../../../shared/resources/instanceData/get/getInstanceDataActionTypes';
import { IProcessState } from '../../../../shared/resources/process/processReducer';
import { getFetchFormDataUrl, getFetchFormDynamicsUrl } from '../../../../utils/urlHelper';
import { fetchJsonSchemaFulfilled } from '../../datamodel/datamodelSlice';

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
    const formData = convertModelToDataBinding(fetchedData);
    yield put(FormDataActions.fetchFormDataFulfilled({ formData }));
  } catch (error) {
    yield put(FormDataActions.fetchFormDataRejected({ error }));
  }
}

export function* watchFormDataSaga(): SagaIterator {
  yield takeLatest(FormDataActions.fetchFormData, fetchFormDataSaga);
}

function* fetchFormDataInitialSaga(): SagaIterator {
  try {
    // This is a temporary solution for the "one task - one datamodel - process"
    const applicationMetadata: IApplicationMetadata = yield select(appMetaDataSelector);
    const instance: IInstance = yield select(instanceDataSelector);

    const currentTaskDataId = getCurrentTaskDataElementId(applicationMetadata, instance);
    const fetchedData: any = yield call(get, getFetchFormDataUrl(instance.id, currentTaskDataId));

    const formData = convertModelToDataBinding(fetchedData);
    yield put(FormDataActions.fetchFormDataFulfilled({ formData }));

    yield call(
      FormRulesActions.fetchRuleModel,
    );

    yield call(
      FormDynamicsActions.fetchFormDynamics,
      getFetchFormDynamicsUrl(),
    );
  } catch (error) {
    yield put(FormDataActions.fetchFormDataRejected({ error }));
    yield call(QueueActions.dataTaskQueueError, error);
  }
}

export function* watchFetchFormDataInitialSaga(): SagaIterator {
  while (true) {
    yield take(FormDataActions.fetchFormDataInitial);
    const processState: IProcessState = yield select(processStateSelector);
    const instance: IInstance = yield select(instanceDataSelector);
    if (!processState || !instance || processState.taskId !== instance.process.currentTask.elementId) {
      yield all([
        take(GET_INSTANCEDATA_FULFILLED),
        take(fetchJsonSchemaFulfilled),
      ]);
    } else {
      yield all([
        take(fetchJsonSchemaFulfilled),
      ]);
    }
    yield call(fetchFormDataInitialSaga);
  }
}
