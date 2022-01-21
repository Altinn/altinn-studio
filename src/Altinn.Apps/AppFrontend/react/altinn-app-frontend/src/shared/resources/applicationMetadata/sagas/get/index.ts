import { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { applicationMetadataApiUrl } from '../../../../../utils/urlHelper2';
import ApplicationMetadataActions from '../../actions';
import { FETCH_APPLICATION_METADATA } from '../../actions/types';
import { appTaskQueueError } from '../../../queue/queueSlice';

function* getApplicationMetadata(): SagaIterator {
  try {
    const applicationMetadata = yield call(get, applicationMetadataApiUrl);
    yield call(ApplicationMetadataActions.getApplicationMetadataFulfilled, applicationMetadata);
  } catch (error) {
    yield call(ApplicationMetadataActions.getApplicationMetadataRejected, error);
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FETCH_APPLICATION_METADATA, getApplicationMetadata);
}
