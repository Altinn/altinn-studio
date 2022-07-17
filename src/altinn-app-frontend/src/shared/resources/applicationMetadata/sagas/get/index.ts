import type { SagaIterator } from 'redux-saga';
import { call, put } from 'redux-saga/effects';
import { get } from '../../../../../utils/networking';
import { applicationMetadataApiUrl } from '../../../../../utils/appUrlHelper';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { QueueActions } from '../../../queue/queueSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';

export function* getApplicationMetadata(): SagaIterator {
  try {
    const applicationMetadata = yield call(get, applicationMetadataApiUrl);
    yield put(ApplicationMetadataActions.getFulfilled({ applicationMetadata }));
  } catch (error) {
    yield put(ApplicationMetadataActions.getRejected({ error }));
    yield put(LanguageActions.fetchDefaultLanguage()); // make sure default texts are fetched
    yield put(QueueActions.appTaskQueueError({ error }));
  }
}
