import { SagaIterator } from 'redux-saga';
import { call, takeLatest, put } from 'redux-saga/effects';
import { get, put as axiosPut, del } from '../../../utils/networking';
import { createDatamodellingUrl } from '../../../utils/urlHelper';
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
import { getDeleteDataModelUrl, getFetchDataModelUrl, getSaveDataModelUrl } from '../../../../app-development/utils/urlHelper';
import { ApplicationMetadataActions } from '../../../../app-development/sharedResources/applicationMetadata/applicationMetadataSlice';
import { DatamodelsMetadataActions } from './datamodelsMetadata/datamodelsMetadataSlice';

export function* fetchDataModelSaga(action: IDataModelAction): SagaIterator {
  const { repoType, metadata } = action.payload;
  yield put(fetchDataModelFulfilled({ schema: undefined })); // remove current schema from state before fetching
  try {
    if (repoType === 'datamodel') { // add 's' to the end of comp once api is ready.
      const modelPath = metadata?.value?.repositoryRelativeUrl;
      const result = yield call(get, createDatamodellingUrl(modelPath));
      yield put(fetchDataModelFulfilled({ schema: result }));
    } else {
      const result = yield call(get, getFetchDataModelUrl(metadata.label));
      yield put(fetchDataModelFulfilled({ schema: result }));
    }
  } catch (err) {
    yield put(fetchDataModelRejected({ error: err }));
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(fetchDataModel.type, fetchDataModelSaga);
}

function* saveDatamodelSaga(action: IDataModelAction) {
  const { schema, repoType, metadata } = action.payload;
  try {
    if (repoType === 'datamodels') {
      const modelPath = metadata?.value?.repositoryRelativeUrl;
      yield call(axiosPut, createDatamodellingUrl(modelPath), schema);
      yield put(saveDataModelFulfilled());
      yield put(DatamodelsMetadataActions.getDatamodelsMetadata());
    }
    else {
      yield call(axiosPut, getSaveDataModelUrl(metadata.label), schema);
      yield put(saveDataModelFulfilled());
      yield put(ApplicationMetadataActions.getApplicationMetadata());
    }
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDatamodelSaga);
}

function* deleteDataModelSaga(action: IDataModelAction): SagaIterator {
  const { repoType, metadata } = action.payload;
  try {
    if (repoType === 'datamodels') {
      yield call(del, getDeleteDataModelUrl(metadata.label));
      // const modelPath = metadata?.value?.repositoryRelativeUrl;
      // yield call(del, createDatamodellingUrl(modelPath));
      yield put(deleteDataModelFulfilled());
      yield put(DatamodelsMetadataActions.getDatamodelsMetadata());
    } else {
      yield call(del, getDeleteDataModelUrl(metadata.label));
      yield put(deleteDataModelFulfilled());
      yield put(ApplicationMetadataActions.getApplicationMetadata());
    }
  } catch (err) {
    yield put(deleteDataModelRejected({ error: err }));
  }
}

export function* watchDeleteDataModelSaga(): SagaIterator {
  yield takeLatest(deleteDataModel.type, deleteDataModelSaga);
}
