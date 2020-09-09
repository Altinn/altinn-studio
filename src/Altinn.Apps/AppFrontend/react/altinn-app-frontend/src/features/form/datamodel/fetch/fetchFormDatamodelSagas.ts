import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, all, take } from 'redux-saga/effects';
import { FETCH_APPLICATION_METADATA_FULFILLED } from 'src/shared/resources/applicationMetadata/actions/types';
import { getJsonSchemaUrl } from 'src/utils/urlHelper';
import DataModelActions from '../formDatamodelActions';
import { IFetchDataModel } from './fetchFormDatamodelActions';
import * as ActionTypes from './fetchFormDatamodelActionTypes';
import QueueActions from '../../../../shared/resources/queue/queueActions';
import { get } from '../../../../utils/networking';
import { IRuntimeState } from '../../../../types';
import { IApplicationMetadata } from '../../../../shared/resources/applicationMetadata';

const AppMetadataSelector: (state: IRuntimeState) => IApplicationMetadata =
  (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;

function* fetchFormDataModelSaga({ url }: IFetchDataModel): SagaIterator {
  try {
    const dataModel: any = yield call(get, url);
    const dataModelFields: any[] = [];
    for (const dataModelField in dataModel.elements) {
      if (!dataModelField) {
        continue;
      }
      dataModelFields.push(dataModel.elements[dataModelField]);
    }
    yield call(DataModelActions.fetchDataModelFulfilled, dataModelFields);
  } catch (err) {
    yield call(DataModelActions.fetchDataModelRejected, err);
    yield call(QueueActions.dataTaskQueueError, err)
  }
}

export function* watchFetchFormDataModelSaga(): SagaIterator {
  yield takeLatest(ActionTypes.FETCH_DATA_MODEL, fetchFormDataModelSaga);
}

function* fetchJsonSchemaSaga(): SagaIterator {
  try {
    const url = getJsonSchemaUrl();
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
  yield all([
    take(ActionTypes.FETCH_JSON_SCHEMA),
    take(FETCH_APPLICATION_METADATA_FULFILLED),
  ]);
  yield call(fetchJsonSchemaSaga);
}
