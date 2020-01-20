import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get, post } from 'app-shared/utils/networking';
import { getApplicationMetadataUrl } from 'app-shared/utils/urlHelper';
import * as MetadataActionTypes from '../applicationMetadataActionTypes';
import metadataActionDispatcher from '../applicationMetadataDispatcher';

export function* getApplicationMetadataSaga(): SagaIterator {
  const url = getApplicationMetadataUrl();
  try {
    const result = yield call(get, url);
    yield call(metadataActionDispatcher.getApplicationMetadataFulfilled, result);
  } catch (error) {
    if (error.status === 404) {
      // The application metadata does not exist, create one then fetch.
      // This might happen for old services, which does not yet have a metadata file
      yield call(post, url);
      yield call(metadataActionDispatcher.getApplicationMetadata);
    } else {
      yield call(metadataActionDispatcher.getApplicationMetadataRejected, error);
    }
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(
    MetadataActionTypes.GET_APPLICATION_METADATA,
    getApplicationMetadataSaga,
  );
}
