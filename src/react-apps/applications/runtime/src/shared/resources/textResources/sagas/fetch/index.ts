import { SagaIterator } from 'redux-saga';
import { call, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { textResourcesUrl } from '../../../../../utils/urlHelper';
import TextResourcesActions from '../../actions';
import { FETCH_TEXT_RESOURCES } from '../../actions/types';

function* fetchTextResources(): SagaIterator {
  try {
    const resource = yield call(get, textResourcesUrl);
    yield call(TextResourcesActions.fetchTextResourcesFulfilled, resource.language, resource.resources);
  } catch (err) {
    yield call(TextResourcesActions.fetchTextResourcesRejected, err);
  }
}

export function* watchFetchTextResourcesSaga(): SagaIterator {
  yield takeLatest(FETCH_TEXT_RESOURCES, fetchTextResources);
}
