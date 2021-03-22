import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, all, take, put } from 'redux-saga/effects';
import { get, put as axiosPut, del } from 'app-shared/utils/networking';
import { fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
  setDataModelName,
  IDataModelAction,
  deleteDataModel,
  deleteDataModelFulfilled,
  deleteDataModelRejected } from './dataModelingSlice';
import { getDeleteDataModelUrl, getFetchDataModelUrl, getSaveDataModelUrl } from '../../utils/urlHelper';
import { ApplicationMetadataActions } from '../../sharedResources/applicationMetadata/applicationMetadataSlice';

const modelNameState = (state: IServiceDevelopmentState) => state.dataModeling.modelName;

export function* fetchDataModelSaga(): SagaIterator {
  try {
    const modelName: string = yield select(modelNameState);
    const url = getFetchDataModelUrl(modelName);
    const result = yield call(get, url);
    yield put(fetchDataModelFulfilled({ schema: result }));
  } catch (err) {
    yield put(fetchDataModelRejected({ error: err }));
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  while (true) {
    yield all([
      take(fetchDataModel.type),
      take(setDataModelName.type),
    ]);
    yield call(fetchDataModelSaga);
  }
}

export function* saveDatamodelSaga(action: IDataModelAction) {
  try {
    const { schema } = action.payload;
    const modelName: string = yield select(modelNameState);
    const url = getSaveDataModelUrl(modelName);
    yield axiosPut(url, schema);
    yield put(saveDataModelFulfilled({}));
    yield put(ApplicationMetadataActions.getApplicationMetadata());
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDatamodelSaga);
}

export function* deleteDataModelSaga(): SagaIterator {
  try {
    const modelName = yield select(modelNameState);
    const url = getDeleteDataModelUrl(modelName);
    yield call(del, url);
    yield put(deleteDataModelFulfilled());
    yield put(ApplicationMetadataActions.getApplicationMetadata());
  } catch (err) {
    yield put(deleteDataModelRejected({ error: err }));
  }
}

export function* watchDeleteDataModelSaga(): SagaIterator {
  yield takeLatest(deleteDataModel.type, deleteDataModelSaga);
}
