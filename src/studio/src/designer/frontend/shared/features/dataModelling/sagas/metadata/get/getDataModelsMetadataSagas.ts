import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { dataModelsMetadataUrl } from '../../../../../utils/urlHelper';
import { DataModelsMetadataActions } from '../dataModelsMetadataSlice';

function* getDataModelsMetadataSaga(): SagaIterator {
  try {
    const result = yield call(get, dataModelsMetadataUrl);
    yield put(DataModelsMetadataActions.getDataModelsMetadataFulfilled({ dataModelsMetadata: result }));
  } catch (error) {
    yield put(DataModelsMetadataActions.getDataModelsMetadataRejected({ error }));
  }
}

export function* watchGetDataModelsMetadataSaga(): SagaIterator {
  yield takeLatest(DataModelsMetadataActions.getDataModelsMetadata, getDataModelsMetadataSaga);
}
