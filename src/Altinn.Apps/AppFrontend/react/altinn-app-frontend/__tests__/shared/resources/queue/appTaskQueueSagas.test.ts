import { expectSaga } from 'redux-saga-test-plan';
import { startInitialAppTaskQueueSaga } from 'src/shared/resources/queue/appTask/appTaskQueueSagas';
import { startInitialAppTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';
import TextResourcesActions from 'src/shared/resources/textResources/textResourcesActions';
import ProfileActions from 'src/shared/resources/profile/profileActions';
import { profileApiUrl } from 'src/utils/appUrlHelper';
import LanguageActions from 'src/shared/resources/language/languageActions';
import ApplicationMetadataActionDispatcher from 'src/shared/resources/applicationMetadata/actions';
import PartyActions from 'src/shared/resources/party/partyActions';
import OrgsActions from 'src/shared/resources/orgs/orgsActions';

describe('appTaskQueueSagas', () => {
  it('startInitialAppTaskQueueSaga, app queue is started', () => {
    return expectSaga(startInitialAppTaskQueueSaga)
      .call(ProfileActions.fetchProfile, profileApiUrl)
      .call(TextResourcesActions.fetchTextResources)
      .call(LanguageActions.fetchLanguage)
      .call(ApplicationMetadataActionDispatcher.getApplicationMetadata)
      .call(PartyActions.getCurrentParty)
      .call(OrgsActions.fetchOrgs)
      .put(startInitialAppTaskQueueFulfilled())
      .run();
  });
});
