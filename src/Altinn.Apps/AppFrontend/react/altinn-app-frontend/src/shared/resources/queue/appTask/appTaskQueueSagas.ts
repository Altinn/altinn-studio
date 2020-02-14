import { SagaIterator } from 'redux-saga';
import { all, call, take } from 'redux-saga/effects';
import QueueActions from '../queueActions';
import ApplicationMetadataActions from '../../applicationMetadata/actions';
import TextResourcesActions from '../../textResources/textResourcesActions';
import ProfileActions from '../../profile/profileActions';
import LanguageActions from '../../language/languageActions';
import PartyActions from '../../party/partyActions';
import { profileApiUrl, languageUrl } from '../../../../utils/urlHelper';

export function* startInitialAppTaskQueue(): SagaIterator {
  yield call(TextResourcesActions.fetchTextResources);
  yield call(ProfileActions.fetchProfile, profileApiUrl);
  yield call(LanguageActions.fetchLanguage, languageUrl, 'nb');
  yield call(ApplicationMetadataActions.getApplicationMetadata);
  yield call(PartyActions.getCurrentParty);
  yield call(QueueActions.startInitialAppTaskQueueFulfilled);
}

export function* watchStartInitialAppTaskQueueSaga(): SagaIterator {
  yield all([
    take(QueueActions.startInitialAppTaskQueue),
  ]);

  yield call(startInitialAppTaskQueue);
}
