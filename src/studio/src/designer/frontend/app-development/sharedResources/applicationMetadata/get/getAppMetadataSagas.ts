import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get, post } from 'app-shared/utils/networking';
import { applicationMetadataUrl } from '../../../utils/urlHelper';
import { ApplicationMetadataActions } from '../applicationMetadataSlice';

function* getApplicationMetadataSaga(): SagaIterator {
  try {
    const result = yield call(get, applicationMetadataUrl);
    yield put(ApplicationMetadataActions.getApplicationMetadataFulfilled({ applicationMetadata: result }));
  } catch (error) {
    if (error.status === 404) {
      // The application metadata does not exist, create one then fetch.
      // This might happen for old services, which does not yet have a metadata file
      yield call(post, applicationMetadataUrl);
      yield put(ApplicationMetadataActions.getApplicationMetadata());
    } else {
      yield put(ApplicationMetadataActions.getApplicationMetadataRejected({ error }));
    }
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(ApplicationMetadataActions.getApplicationMetadata, getApplicationMetadataSaga);
}
