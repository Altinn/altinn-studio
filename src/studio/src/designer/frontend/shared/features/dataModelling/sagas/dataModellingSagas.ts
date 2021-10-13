import { SagaIterator } from 'redux-saga';
import { call, takeLatest, put } from 'redux-saga/effects';
import { ISchema } from '@altinn/schema-editor/types';
import * as net from '../../../utils/networking';
import { sharedUrls } from '../../../utils/urlHelper';
import { fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
  createDataModel,
  createDataModelFulfilled,
  createDataModelRejected,
  IDataModelAction,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected } from './dataModellingSlice';
import { DataModelsMetadataActions } from './metadata';

export function* fetchDataModelSaga(action: IDataModelAction): SagaIterator {
  const { metadata } = action.payload;
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    const result = yield call(net.get, sharedUrls().getDataModelUrl(modelPath));
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
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    yield call(net.put, sharedUrls().saveDataModelUrl(modelPath), schema);
    yield put(saveDataModelFulfilled());
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDataModelSaga);
}

function* createDataModelSaga(action: IDataModelAction) {
  const { modelName, relativeDirectory } = action.payload;
  const body = { modelName, relativeDirectory };
  try {
    const schema: ISchema = yield call(net.post, sharedUrls().createDataModelUrl, body);
    yield put(createDataModelFulfilled({ schema }));
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
  } catch (err) {
    yield put(createDataModelRejected({ error: err }));
  }
}

export function* watchCreateDataModelSaga(): SagaIterator {
  yield takeLatest(createDataModel.type, createDataModelSaga);
}

function* deleteDataModelSaga(action: IDataModelAction): SagaIterator {
  const { metadata } = action.payload;
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    yield call(net.del, sharedUrls().saveDataModelUrl(modelPath));
    yield put(deleteDataModelFulfilled());
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
  } catch (err) {
    yield put(deleteDataModelRejected({ error: err }));
  }
}

export function* watchDeleteDataModelSaga(): SagaIterator {
  yield takeLatest(deleteDataModel.type, deleteDataModelSaga);
}
