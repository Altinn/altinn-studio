import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select } from 'redux-saga/effects';

import DataModelActions from '../formDatamodelActions';
import { IFetchDataModel } from './fetchFormDatamodelActions';
import * as ActionTypes from './fetchFormDatamodelActionTypes';

import ConfigActions from '../../config/formConfigActions';
import QueueActions from '../../../../shared/resources/queue/queueActions';

import { get } from '../../../../utils/networking';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata =
  (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

function* fetchFormDataModelSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);

    const {
      Org,
      ServiceName,
      RepositoryName,
      ServiceId,
    } = dataModel;
    const dataModelFields: any[] = [];
    for (const dataModelField in dataModel.elements) {
      if (!dataModelField) {
        continue;
      }
      dataModelFields.push(dataModel.elements[dataModelField]);
    }
    yield call(DataModelActions.fetchDataModelFulfilled, dataModelFields);
    yield call(ConfigActions.fetchFormConfigFulfilled, Org, ServiceName, RepositoryName, ServiceId);
  } catch (err) {
    yield call(DataModelActions.fetchDataModelRejected, err);
    yield call(QueueActions.dataTaskQueueError, err)
  }
}

export function* watchFetchFormDataModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_DATA_MODEL, fetchFormDataModelSaga);
}

function* fetchJsonSchemaSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const appMetadata = yield select(AppMetadataSelector);
    const dataType = appMetadata.dataTypes.find((type) => !!type.appLogic);
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
  yield takeLatest(ActionTypes.FETCH_JSON_SCHEMA, fetchJsonSchemaSaga);
}
