import { SagaIterator } from 'redux-saga';
import { fork } from 'redux-saga/effects';
import { watchGetDataModelsMetadataSaga } from './metadata';
import { watchDeleteDataModelSaga, watchFetchDataModelSaga, watchSaveDataModelSaga } from './dataModellingSagas';

export function* dataModellingSagas(): SagaIterator {
  yield fork(watchFetchDataModelSaga);
  yield fork(watchSaveDataModelSaga);
  yield fork(watchDeleteDataModelSaga);
  yield fork(watchGetDataModelsMetadataSaga);
}

export {
  IDataModellingState,
  default as dataModellingReducer,
  deleteDataModel,
  fetchDataModel,
  createNewDataModel,
  saveDataModel,
} from './dataModellingSlice';
