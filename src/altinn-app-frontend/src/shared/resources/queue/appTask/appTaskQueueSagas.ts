import type { SagaIterator } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';
import {
  startInitialAppTaskQueue,
  startInitialAppTaskQueueFulfilled,
} from '../queueSlice';
import ApplicationMetadataActions from '../../applicationMetadata/actions';
import { ApplicationSettingsActions } from '../../applicationSettings/applicationSettingsSlice';
import OrgsActions from 'src/shared/resources/orgs/orgsActions';
import TextResourcesActions from '../../textResources/textResourcesActions';
import { LanguageActions } from '../../language/languageSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

export function* startInitialAppTaskQueueSaga(): SagaIterator {
  yield put(ApplicationSettingsActions.fetchApplicationSettings());
  yield call(TextResourcesActions.fetchTextResources);
  yield put(LanguageActions.fetchLanguage());
  yield call(ApplicationMetadataActions.getApplicationMetadata);
  yield put(FormLayoutActions.fetchLayoutSets());
  yield call(OrgsActions.fetchOrgs);
  yield put(startInitialAppTaskQueueFulfilled());
}

export function* watchStartInitialAppTaskQueueSaga(): SagaIterator {
  yield take(startInitialAppTaskQueue);
  yield call(startInitialAppTaskQueueSaga);
}
