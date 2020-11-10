import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get, put } from 'app-shared/utils/networking';
import { IFetchDataModelAction, ISaveDataModelAction } from './dataModelingActions';
import DataModelingDispatcher from './dataModelingDispatcher';
import { FETCH_DATA_MODEL, SAVE_DATA_MODEL } from './dataModelingActionTypes';
import DatamodelingDispatchers from './dataModelingDispatcher';

export function* fetchDataModelSaga({
  url,
}: IFetchDataModelAction): SagaIterator {
  try {
    const result = yield call(get, url);

    yield call(DataModelingDispatcher.fetchServiceFulfilled, result);
  } catch (err) {
    yield call(DataModelingDispatcher.fetchServiceRejected, err);
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield takeLatest(FETCH_DATA_MODEL, fetchDataModelSaga);
}

export function* saveDatamodelSaga({ url, schema }: ISaveDataModelAction) {
  try {
    yield put(url, schema);
    yield call(DatamodelingDispatchers.saveDataModelFulfilled);
  } catch (err) {
    yield call(DatamodelingDispatchers.saveDataModelRejected, err);
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(SAVE_DATA_MODEL, saveDatamodelSaga);
}
