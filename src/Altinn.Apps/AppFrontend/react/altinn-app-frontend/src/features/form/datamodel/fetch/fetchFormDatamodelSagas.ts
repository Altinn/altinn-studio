import { SagaIterator } from 'redux-saga';
import { call, select, all, take, put } from 'redux-saga/effects';
import { getJsonSchemaUrl } from 'src/utils/urlHelper';
import { IInstance } from 'altinn-shared/types';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { get } from '../../../../utils/networking';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { GET_INSTANCEDATA_FULFILLED } from '../../../../shared/resources/instanceData/get/getInstanceDataActionTypes';
import { fetchJsonSchema, fetchJsonSchemaFulfilled, fetchJsonSchemaRejected } from '../datamodelSlice';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata =
  (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

function* fetchJsonSchemaSaga(): SagaIterator {
  try {
    const url = getJsonSchemaUrl();
    const appMetadata: IApplicationMetadata = yield select(AppMetadataSelector);
    const instance: IInstance = yield select(InstanceDataSelector);
    const dataType =
      appMetadata.dataTypes.find((type) => !!type.appLogic && type.taskId === instance.process.currentTask.elementId);
    const id: string = dataType?.id;

    if (id) {
      const schema: any = yield call(get, url + id);
      yield put(fetchJsonSchemaFulfilled({ schema, id }));
    }
  } catch (error) {
    yield put(fetchJsonSchemaRejected({ error }));
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchJsonSchemaSaga(): SagaIterator {
  while (true) {
    yield all([
      take(GET_INSTANCEDATA_FULFILLED),
      take(fetchJsonSchema),
    ]);
    yield call(fetchJsonSchemaSaga);
  }
}
