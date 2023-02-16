import { call, put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { httpGet } from 'src/utils/network/networking';
import { applicationMetadataApiUrl } from 'src/utils/urls/appUrlHelper';

export function* getApplicationMetadata(): SagaIterator {
  try {
    const applicationMetadata = yield call(httpGet, applicationMetadataApiUrl);
    yield put(ApplicationMetadataActions.getFulfilled({ applicationMetadata }));
  } catch (error) {
    yield put(ApplicationMetadataActions.getRejected({ error }));
    yield put(LanguageActions.fetchDefaultLanguage()); // make sure default texts are fetched
    yield put(QueueActions.appTaskQueueError({ error }));
  }
}
