import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../utils/networking';
import { textResourcesUrl } from '../../../../utils/urlHelper';
import TextResourcesActions from '../textResourcesActions';
import QueueActions from '../../queue/queueActions';
import { FETCH_TEXT_RESOURCES } from './fetchTextResourcesActionTypes';

function* fetchTextResources(): SagaIterator {
  try {
    const resource: any = yield call(get, textResourcesUrl);
    yield call(TextResourcesActions.fetchTextResourcesFulfilled, resource.language, resource.resources);
  } catch (err) {
    yield call(TextResourcesActions.fetchTextResourcesRejected, err);
    yield call(QueueActions.appTaskQueueError, err);
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield takeLatest(FETCH_TEXT_RESOURCES, fetchTextResources);
}
