import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, all, take } from 'redux-saga/effects';
import { getJsonSchemaUrl } from 'src/utils/urlHelper';
import { IInstance } from 'altinn-shared/types';
import DataModelActions from '../formDatamodelActions';
import { IFetchDataModel } from './fetchFormDatamodelActions';
import * as ActionTypes from './fetchFormDatamodelActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { get } from '../../../../utils/networking';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';
import { GET_INSTANCEDATA_FULFILLED } from '../../../../shared/resources/instanceData/get/getInstanceDataActionTypes';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata =
  (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const InstanceDataSelector = (state: IRuntimeState) => state.instanceData.instance;

function* fetchFormDataModelSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);
    const dataModelFields: any[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const dataModelField in dataModel.elements) {
      if (!dataModelField) {
        // eslint-disable-next-line no-continue
        continue;
      }
      dataModelFields.push(dataModel.elements[dataModelField]);
    }
    yield call(DataModelActions.fetchDataModelFulfilled, dataModelFields);
  } catch (err) {
    yield call(DataModelActions.fetchDataModelRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchFormDataModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_DATA_MODEL, fetchFormDataModelSaga);
}

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
      yield call(DataModelActions.fetchJsonSchemaFulfilled, schema, id);
    }
  } catch (err) {
    yield call(DataModelActions.fetchJsonSchemaRejected, err);
    yield call(QueueActions.dataTaskQueueError, err);
  }
}

export function* watchFetchJsonSchemaSaga(): SagaIterator {
  while (true) {
    yield all([
      take(GET_INSTANCEDATA_FULFILLED),
      take(ActionTypes.FETCH_JSON_SCHEMA),
    ]);
    yield call(fetchJsonSchemaSaga);
  }
}
