import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from 'app-shared/utils/networking';
import { datamodelsMetadataUrl } from 'app-shared/utils/urlHelper';
import { DatamodelsMetadataActions } from '../datamodelsMetadataSlice';

function* getDatamodelsMetadataSaga(): SagaIterator {
  try {
    const result = yield call(get, datamodelsMetadataUrl);
    yield put(DatamodelsMetadataActions.getDatamodelsMetadataFulfilled({ datamodelsMetadata: result }));
  } catch (error) {
    yield put(DatamodelsMetadataActions.getDatamodelsMetadataRejected({ error }));
  }
}

export function* watchGetDatamodelsMetadataSaga(): SagaIterator {
  yield takeLatest(DatamodelsMetadataActions.getDatamodelsMetadata, getDatamodelsMetadataSaga);
}
