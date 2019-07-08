import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../shared/src/utils/networking';
import { getApplicationMetadataUrl } from '../../../../../shared/src/utils/urlHelper';
import * as MetadataActionTypes from '../applicationMetadataActionTypes';
import metadataActionDispatcher from '../applicationMetadataDispatcher';

export function* getApplicationMetadataSaga(): SagaIterator {
  try {
    const url = getApplicationMetadataUrl();
    const result = yield call(get, url);
    yield call(metadataActionDispatcher.getApplicationMetadataFulfilled, result);
  } catch (error) {
    yield call(metadataActionDispatcher.getApplicationMetadataRejected, error);
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(
    MetadataActionTypes.GET_APPLICATION_METADATA,
    getApplicationMetadataSaga,
  );
}
