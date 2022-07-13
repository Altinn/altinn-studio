/* eslint-disable max-len */
import type { SagaIterator } from 'redux-saga';
import { call, select, all, take, put } from 'redux-saga/effects';
import { getJsonSchemaUrl } from 'src/utils/appUrlHelper';
import type { IInstance } from 'altinn-shared/types';
import {
  getCurrentDataTypeForApplication,
  isStatelessApp,
} from 'src/utils/appMetadata';
import { dataTaskQueueError } from '../../../../shared/resources/queue/queueSlice';
import { get } from '../../../../utils/networking';
import type { ILayoutSets, IRuntimeState } from '../../../../types';
import type { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { DataModelActions } from '../datamodelSlice';
import { FormLayoutActions } from '../../layout/formLayoutSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata = (
  state: IRuntimeState,
) => state.applicationMetadata.applicationMetadata;
const InstanceDataSelector = (state: IRuntimeState) =>
  state.instanceData.instance;

function* fetchJsonSchemaSaga(): SagaIterator {
  try {
    const url = getJsonSchemaUrl();
    const appMetadata: IApplicationMetadata = yield select(AppMetadataSelector);
    const instance: IInstance = yield select(InstanceDataSelector);
    const layoutSets: ILayoutSets = yield select(
      (state: IRuntimeState) => state.formLayout.layoutsets,
    );

    const dataTypeId = getCurrentDataTypeForApplication({
      application: appMetadata,
      instance,
      layoutSets,
    });

    if (dataTypeId) {
      const schema: any = yield call(get, url + dataTypeId);
      yield put(
        DataModelActions.fetchJsonSchemaFulfilled({ schema, id: dataTypeId }),
      );
    }
  } catch (error) {
    yield put(DataModelActions.fetchJsonSchemaRejected({ error }));
    yield put(dataTaskQueueError({ error }));
  }
}

export function* watchFetchJsonSchemaSaga(): SagaIterator {
  yield all([
    take(ApplicationMetadataActions.getFulfilled),
    take(FormLayoutActions.fetchSetsFulfilled),
    take(DataModelActions.fetchJsonSchema),
  ]);
  const application: IApplicationMetadata = yield select(
    (state: IRuntimeState) => state.applicationMetadata.applicationMetadata,
  );
  if (isStatelessApp(application)) {
    yield call(fetchJsonSchemaSaga);
    while (true) {
      yield take(DataModelActions.fetchJsonSchema);
      yield call(fetchJsonSchemaSaga);
    }
  } else {
    yield call(fetchJsonSchemaSaga);
    while (true) {
      yield all([
        take(InstanceDataActions.getFulfilled),
        take(DataModelActions.fetchJsonSchema),
      ]);
      yield call(fetchJsonSchemaSaga);
    }
  }
}
