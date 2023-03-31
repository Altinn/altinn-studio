import { call, put } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { ApplicationMetadataActions } from 'src/features/applicationMetadata/applicationMetadataSlice';
import { LanguageActions } from 'src/features/language/languageSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { httpGet } from 'src/utils/network/networking';
import { applicationMetadataApiUrl } from 'src/utils/urls/appUrlHelper';

export function* getApplicationMetadataSaga(): SagaIterator {
  try {
    const applicationMetadata = yield call(httpGet, applicationMetadataApiUrl);
    yield put(ApplicationMetadataActions.getFulfilled({ applicationMetadata }));
  } catch (error) {
    yield put(ApplicationMetadataActions.getRejected({ error }));
    yield put(LanguageActions.fetchDefaultLanguage()); // make sure default texts are fetched
    yield put(QueueActions.appTaskQueueError({ error }));
  }
}
