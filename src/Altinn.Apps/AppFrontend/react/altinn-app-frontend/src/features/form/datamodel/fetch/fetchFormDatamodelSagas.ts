/* eslint-disable max-len */
import { SagaIterator } from 'redux-saga';
import { call, select, all, take, put } from 'redux-saga/effects';
import { getJsonSchemaUrl } from 'src/utils/urlHelper';
import { IInstance } from 'altinn-shared/types';
import { getCurrentDataTypeForApplication, isStatelessApp } from 'src/utils/appMetadata';
import { FETCH_APPLICATION_METADATA_FULFILLED } from 'src/shared/resources/applicationMetadata/actions/types';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { get } from '../../../../utils/networking';
import { ILayoutSets, IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { GET_INSTANCEDATA_FULFILLED } from '../../../../shared/resources/instanceData/get/getInstanceDataActionTypes';
import { fetchJsonSchema, fetchJsonSchemaFulfilled, fetchJsonSchemaRejected } from '../datamodelSlice';
import { FormLayoutActions } from '../../layout/formLayoutSlice';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata =
  (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

function* fetchJsonSchemaSaga(): SagaIterator {
  try {
    const url = getJsonSchemaUrl();
    const appMetadata: IApplicationMetadata = yield select(AppMetadataSelector);
    const instance: IInstance = yield select(InstanceDataSelector);
    const layoutSets: ILayoutSets = yield select((state: IRuntimeState) => state.formLayout.layoutsets);

    const dataTypeId = getCurrentDataTypeForApplication(appMetadata, instance, layoutSets);

    if (dataTypeId) {
      const schema: any = yield call(get, url + dataTypeId);
      yield put(fetchJsonSchemaFulfilled({ schema, id: dataTypeId }));
    }
  } catch (error) {
    yield put(fetchJsonSchemaRejected({ error }));
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchJsonSchemaSaga(): SagaIterator {
  yield all([
    take(FETCH_APPLICATION_METADATA_FULFILLED),
    take(FormLayoutActions.fetchLayoutSetsFulfilled),
    take(fetchJsonSchema),
  ]);
  const application: IApplicationMetadata = yield select((state: IRuntimeState) => state.applicationMetadata.applicationMetadata);
  if (isStatelessApp(application)) {
    yield call(fetchJsonSchemaSaga);
    while (true) {
      yield take(fetchJsonSchema);
      yield call(fetchJsonSchemaSaga);
    }
  } else {
    yield call(fetchJsonSchemaSaga);
    while (true) {
      yield all([
        take(GET_INSTANCEDATA_FULFILLED),
        take(fetchJsonSchema),
      ]);
      yield call(fetchJsonSchemaSaga);
    }
  }
}
