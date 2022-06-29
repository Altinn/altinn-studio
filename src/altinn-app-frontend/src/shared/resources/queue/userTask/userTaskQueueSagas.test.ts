import { expectSaga } from 'redux-saga-test-plan';

import ProfileActions from 'src/shared/resources/profile/profileActions';
import { profileApiUrl } from 'src/utils/appUrlHelper';
import PartyActions from 'src/shared/resources/party/partyActions';
import { startInitialUserTaskQueueSaga } from 'src/shared/resources/queue/userTask/userTaskQueueSagas';
import { startInitialUserTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';

describe('userTaskQueueSagas', () => {
  it('startInitialUserTaskQueueSaga, app queue is started', () => {
    return expectSaga(startInitialUserTaskQueueSaga)
      .call(ProfileActions.fetchProfile, profileApiUrl)
      .call(PartyActions.getCurrentParty)
      .put(startInitialUserTaskQueueFulfilled())
      .run();
  });
});
