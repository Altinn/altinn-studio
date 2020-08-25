import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { applicationMetadataApiUrl } from '../../../../utils/urlHelper';
import ApplicationMetadataActions from '../../actions';
import { FETCH_APPLICATION_METADATA } from '../../actions/types';
import QueueActions from '../../../../resources/queue/queueActions';

function* getApplicationMetadata(): SagaIterator {
  try {
    const applicationMetadata = yield call(get, applicationMetadataApiUrl);
    yield call(ApplicationMetadataActions.getApplicationMetadataFulfilled, applicationMetadata);
  } catch (err) {
    yield call(ApplicationMetadataActions.getApplicationMetadataRejected, err);
    yield call(QueueActions.appTaskQueueError, err);
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FETCH_APPLICATION_METADATA, getApplicationMetadata);
}
