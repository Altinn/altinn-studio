import { SagaIterator } from 'redux-saga';
import { call, put, take } from 'redux-saga/effects';
import { startInitialAppTaskQueue, startInitialAppTaskQueueFulfilled } from '../queueSlice';
import ApplicationMetadataActions from '../../applicationMetadata/actions';
import { ApplicationSettingsActions } from '../../applicationSettings/applicationSettingsSlice';

import TextResourcesActions from '../../textResources/textResourcesActions';
import ProfileActions from '../../profile/profileActions';
import LanguageActions from '../../language/languageActions';
import PartyActions from '../../party/partyActions';
import OrgsActions from 'src/shared/resources/orgs/orgsActions';
import { profileApiUrl } from '../../../../utils/appUrlHelper';

export function* startInitialAppTaskQueueSaga(): SagaIterator {
  yield put(ApplicationSettingsActions.fetchApplicationSettings());
  yield call(ProfileActions.fetchProfile, profileApiUrl);
  yield call(TextResourcesActions.fetchTextResources);
  yield call(LanguageActions.fetchLanguage);
  yield call(ApplicationMetadataActions.getApplicationMetadata);
  yield call(PartyActions.getCurrentParty);
  yield call(OrgsActions.fetchOrgs);
  yield put(startInitialAppTaskQueueFulfilled());
}

export function* watchStartInitialAppTaskQueueSaga(): SagaIterator {
  yield take(startInitialAppTaskQueue);
  yield call(startInitialAppTaskQueueSaga);
}
