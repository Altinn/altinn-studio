import { expectSaga } from 'redux-saga-test-plan';

import { startInitialAppTaskQueueSaga } from 'src/shared/resources/queue/appTask/appTaskQueueSagas';
import { startInitialAppTaskQueueFulfilled } from 'src/shared/resources/queue/queueSlice';
import { TextResourcesActions } from 'src/shared/resources/textResources/textResourcesSlice';
import { LanguageActions } from 'src/shared/resources/language/languageSlice';
import { OrgsActions } from 'src/shared/resources/orgs/orgsSlice';
import { ApplicationMetadataActions } from 'src/shared/resources/applicationMetadata/applicationMetadataSlice';
import { startInitialUserTaskQueueSaga } from 'src/shared/resources/queue/userTask/userTaskQueueSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

describe('appTaskQueueSagas', () => {
  it('startInitialAppTaskQueueSaga, app queue is started', () => {
    expectSaga(startInitialUserTaskQueueSaga).run();
    return expectSaga(startInitialAppTaskQueueSaga)
      .put(TextResourcesActions.fetch())
      .put(LanguageActions.fetchLanguage())
      .put(ApplicationMetadataActions.get())
      .put(FormLayoutActions.fetchSets())
      .put(OrgsActions.fetch())
      .put(startInitialAppTaskQueueFulfilled())
      .run();
  });
});
