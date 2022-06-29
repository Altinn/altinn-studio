import type { SagaIterator } from 'redux-saga';
import { call, put, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { applicationMetadataApiUrl } from '../../../../../utils/appUrlHelper';
import ApplicationMetadataActions from '../../actions';
import { FETCH_APPLICATION_METADATA } from '../../actions/types';
import { appTaskQueueError } from '../../../queue/queueSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';

function* getApplicationMetadata(): SagaIterator {
  try {
    const applicationMetadata = yield call(get, applicationMetadataApiUrl);
    yield call(
      ApplicationMetadataActions.getApplicationMetadataFulfilled,
      applicationMetadata,
    );
  } catch (error) {
    yield call(
      ApplicationMetadataActions.getApplicationMetadataRejected,
      error,
    );
    yield put(LanguageActions.fetchDefaultLanguage()); // make sure default texts are fetched
    yield put(appTaskQueueError({ error }));
  }
}

export function* watchGetApplicationMetadataSaga(): SagaIterator {
  yield takeLatest(FETCH_APPLICATION_METADATA, getApplicationMetadata);
}
