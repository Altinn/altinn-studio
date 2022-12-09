import { all, call, put, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { getCurrentDataTypeForApplication, isStatelessApp } from 'src/utils/appMetadata';
import { get } from 'src/utils/network/networking';
import { getJsonSchemaUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import type { ILayoutSets, IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata | null = (state: IRuntimeState) =>
  state.applicationMetadata.applicationMetadata;
const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

function* fetchJsonSchemaSaga(): SagaIterator {
  try {
    const url = getJsonSchemaUrl();
    const appMetadata: IApplicationMetadata | null = yield select(AppMetadataSelector);
    const instance: IInstance | null = yield select(InstanceDataSelector);
    const layoutSets: ILayoutSets | null = yield select((state: IRuntimeState) => state.formLayout.layoutsets);

    const dataTypeId = getCurrentDataTypeForApplication({
      application: appMetadata,
      instance,
      layoutSets,
    });

    if (dataTypeId) {
      const schema: any = yield call(get, url + dataTypeId);
      yield put(DataModelActions.fetchJsonSchemaFulfilled({ schema, id: dataTypeId }));
    }
  } catch (error) {
    yield put(DataModelActions.fetchJsonSchemaRejected({ error }));
    yield put(QueueActions.dataTaskQueueError({ error }));
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
      yield all([take(InstanceDataActions.getFulfilled), take(DataModelActions.fetchJsonSchema)]);
      yield call(fetchJsonSchemaSaga);
    }
  }
}
