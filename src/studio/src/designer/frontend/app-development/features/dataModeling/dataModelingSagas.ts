import { SagaIterator } from 'redux-saga';
import { call, takeLatest, select, all, take, put } from 'redux-saga/effects';
import { get, put as axiosPut } from 'app-shared/utils/networking';
import { fetchDataModel,
  fetchDataModelFulfilled,
  fetchDataModelRejected,
  saveDataModel,
  saveDataModelFulfilled,
  saveDataModelRejected,
  setDataModelFilePath,
  IDataModelAction } from './dataModelingSlice';
import { getFetchDataModelUrl, getSaveDataModelUrl } from '../../utils/urlHelper';

const filePathState = (state: IServiceDevelopmentState) => state.dataModeling.filePath;

export function* fetchDataModelSaga(): SagaIterator {
  try {
    const filePath = yield select(filePathState);
    const url = getFetchDataModelUrl(filePath);
    const result = yield call(get, url);
    yield put(fetchDataModelFulfilled({ schema: result }));
  } catch (err) {
    yield put(fetchDataModelRejected({ error: err }));
  }
}

export function* watchFetchDataModelSaga(): SagaIterator {
  yield all([
    take(fetchDataModel.type),
    take(setDataModelFilePath.type),
  ]);
  yield call(fetchDataModelSaga);
}

export function* saveDatamodelSaga(action: IDataModelAction) {
  try {
    const { schema } = action.payload;
    const filePath = yield select(filePathState);
    const url = getSaveDataModelUrl(filePath);
    yield axiosPut(url, schema);
    yield put(saveDataModelFulfilled({}));
  } catch (err) {
    yield put(saveDataModelRejected({ error: err }));
  }
}

export function* watchSaveDataModelSaga(): SagaIterator {
  yield takeLatest(saveDataModel.type, saveDatamodelSaga);
}
