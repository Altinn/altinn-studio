import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select } from 'redux-saga/effects';
import { get, put } from 'app-shared/utils/networking';
import { ISaveDataModelAction } from './dataModelingActions';
import { FETCH_DATA_MODEL, SAVE_DATA_MODEL } from './dataModelingActionTypes';
import DataModelingDispatchers from './dataModelingDispatcher';
import { getFetchDataModelUrl, getSaveDataModelUrl } from '../../utils/urlHelper';

const filePathState = (state: IServiceDevelopmentState) => state.dataModeling.filePath;

export function* fetchDataModelSaga(): SagaIterator {
  try {
    const filePath = yield select(filePathState);
    const url = getFetchDataModelUrl(filePath);
    const result = yield call(get, url);
    yield call(DataModelingDispatchers.fetchDataModelFulfilled, result);
  } catch (err) {
    yield call(DataModelingDispatchers.fetchDataModelRejected, err);
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(FETCH_DATA_MODEL, fetchDataModelSaga);
}

export function* saveDatamodelSaga({ schema }: ISaveDataModelAction) {
  try {
    const filePath = yield select(filePathState);
    const url = getSaveDataModelUrl(filePath);
    yield put(url, schema);
    yield call(DataModelingDispatchers.saveDataModelFulfilled);
  } catch (err) {
    yield call(DataModelingDispatchers.saveDataModelRejected, err);
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(SAVE_DATA_MODEL, saveDatamodelSaga);
}
