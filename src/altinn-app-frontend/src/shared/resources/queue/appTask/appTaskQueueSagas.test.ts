import { expectSaga } from 'redux-saga-test-plan';

import { startInitialAppTaskQueueSaga } from 'src/shared/resources/queue/appTask/appTaskQueueSagas';
import { startInitialAppTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';
import TextResourcesActions from 'src/shared/resources/textResources/textResourcesActions';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import OrgsActions from 'src/shared/resources/orgs/orgsActions';
import ApplicationMetadataActionDispatcher from 'src/shared/resources/applicationMetadata/actions';
import { startInitialUserTaskQueueSaga } from 'src/shared/resources/queue/userTask/userTaskQueueSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

describe('appTaskQueueSagas', () => {
  it('startInitialAppTaskQueueSaga, app queue is started', () => {
    expectSaga(startInitialUserTaskQueueSaga).run();
    return expectSaga(startInitialAppTaskQueueSaga)
      .call(TextResourcesActions.fetchTextResources)
      .put(LanguageActions.fetchLanguage())
      .call(ApplicationMetadataActionDispatcher.getApplicationMetadata)
      .put(FormLayoutActions.fetchLayoutSets())
      .call(OrgsActions.fetchOrgs)
      .put(startInitialAppTaskQueueFulfilled())
      .run();
  });
});
