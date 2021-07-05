import { SagaIterator } from 'redux-saga';
import { call, takeLatest, put } from 'redux-saga/effects';
import { get, put as axiosPut, del } from '../../../utils/networking';
import { sharedUrls } from '../../../utils/urlHelper';
import {
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
  IDataModelAction,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected,
} from './dataModellingSlice';
import { DataModelsMetadataActions } from './metadata';

export function* fetchDataModelSaga(action: IDataModelAction): SagaIterator {
  const { metadata } = action.payload;
  yield put(fetchDataModelFulfilled({ schema: undefined })); // remove current schema from state before fetching
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    const result = yield call(get, sharedUrls().createDataModellingUrl(modelPath));
    yield put(fetchDataModelFulfilled({ schema: result }));
  } catch (err) {
    yield put(fetchDataModelRejected({ error: err }));
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(fetchDataModel.type, fetchDataModelSaga);
}

function* saveDataModelSaga(action: IDataModelAction) {
  const { schema, metadata } = action.payload;
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl || `/App/models/${metadata.label}.schema.json`;
    yield call(axiosPut, sharedUrls().createDataModellingUrl(modelPath), schema);
    yield put(saveDataModelFulfilled());
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDataModelSaga);
}

function* deleteDataModelSaga(action: IDataModelAction): SagaIterator {
  const { metadata } = action.payload;
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    yield call(del, sharedUrls().createDataModellingUrl(modelPath));
    yield put(deleteDataModelFulfilled());
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
  } catch (err) {
    yield put(deleteDataModelRejected({ error: err }));
  }
}

export function* watchDeleteDataModelSaga(): SagaIterator {
  yield takeLatest(deleteDataModel.type, deleteDataModelSaga);
}
