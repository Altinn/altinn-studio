import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, all, take, put } from 'redux-saga/effects';
import { get, put as axiosPut } from 'app-shared/utils/networking';
import { ISaveDataModelAction } from './dataModelingActions';
import { FETCH_DATA_MODEL, SAVE_DATA_MODEL, SET_DATA_MODEL_FILE_PATH } from './dataModelingActionTypes';
// import DataModelingDispatchers from './dataModelingDispatcher';
import { fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModelFulfilled,
  saveDataModelRejected } from './datamodelingSlice';
import { getFetchDataModelUrl, getSaveDataModelUrl } from '../../utils/urlHelper';

const filePathState = (state: IServiceDevelopmentState) => state.dataModeling.filePath;

export function* fetchDataModelSaga(): SagaIterator {
  try {
    const filePath = yield select(filePathState);
    const url = getFetchDataModelUrl(filePath);
    const result = yield call(get, url);
    // yield call(DataModelingDispatchers.fetchDataModelFulfilled, result);
    yield put(fetchDataModelFulfilled, {schema: result})
  } catch (err) {
    yield call(DataModelingDispatchers.fetchDataModelRejected, err);
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield all([
    take(FETCH_DATA_MODEL),
    take(SET_DATA_MODEL_FILE_PATH),
  ]);
  yield call(fetchDataModelSaga);
}

export function* saveDatamodelSaga({ schema }: ISaveDataModelAction) {
  try {
    const filePath = yield select(filePathState);
    const url = getSaveDataModelUrl(filePath);
    yield axiosPut(url, schema);
    yield call(DataModelingDispatchers.saveDataModelFulfilled);
  } catch (err) {
    yield call(DataModelingDispatchers.saveDataModelRejected, err);
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(SAVE_DATA_MODEL, saveDatamodelSaga);
}
