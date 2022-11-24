import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import type { IJsonSchema } from '@altinn/schema-editor/types';
import { del, get, post, put as networkPut } from '../../../utils/networking';
import {
  createDataModel,
  createDataModelFulfilled,
  createDataModelRejected,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected,
  fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  IDataModelAction,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
} from './dataModellingSlice';
import { DataModelsMetadataActions } from './metadata';
import {
  createDatamodelPath,
  datamodelAddXsdFromRepoPath,
  datamodelPath,
  datamodelGetPath,
} from '../../../api-paths';
import { _useParamsClassCompHack } from '../../../utils/_useParamsClassCompHack';

export function* fetchDataModelSaga(action: IDataModelAction): SagaIterator {
  const { metadata } = action.payload;
  try {
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    const { org, app } = _useParamsClassCompHack();
    let result;
    if (metadata?.value?.fileType === '.xsd') {
      result = yield call(post, datamodelAddXsdFromRepoPath(org, app, modelPath.slice(1)));
      yield put(DataModelsMetadataActions.getDataModelsMetadata());
    } else {
      result = yield call(get, datamodelGetPath(org, app, modelPath));
    }
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
    const { org, app } = _useParamsClassCompHack();
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    yield call(networkPut, datamodelPath(org, app, modelPath), schema);
    yield put(saveDataModelFulfilled());
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDataModelSaga);
}

function* createDataModelSaga(action: IDataModelAction) {
  const { name, relativePath } = action.payload;
  const body = { modelName: name, relativeDirectory: relativePath };
  const { org, app } = _useParamsClassCompHack();
  try {
    const schema: IJsonSchema = yield call(
      post,
      createDatamodelPath(org, app),
      body,
    );
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
    yield put(createDataModelFulfilled({ schema }));
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
    const { org, app } = _useParamsClassCompHack();
    const modelPath = metadata?.value?.repositoryRelativeUrl;
    yield call(del, datamodelPath(org, app, modelPath));
    yield put(DataModelsMetadataActions.getDataModelsMetadata());
    yield put(deleteDataModelFulfilled());
  } catch (err) {
    yield put(deleteDataModelRejected({ error: err }));
  }
}

export function* watchDeleteDataModelSaga(): SagaIterator {
  yield takeLatest(deleteDataModel.type, deleteDataModelSaga);
}
