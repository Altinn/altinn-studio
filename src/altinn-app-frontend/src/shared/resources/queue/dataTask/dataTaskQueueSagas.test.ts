import { expectSaga } from 'redux-saga-test-plan';

import { startInitialDataTaskQueueSaga } from './dataTaskQueueSagas';
import { startInitialDataTaskQueueFulfilled } from '../queueSlice';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { DataModelActions } from 'src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

describe('dataTaskQueueSagas', () => {
  it('startInitialAppTaskQueueSaga, app queue is started', () => {
    return expectSaga(startInitialDataTaskQueueSaga)
      .put(FormDataActions.fetchInitial())
      .put(DataModelActions.fetchJsonSchema())
      .put(FormLayoutActions.fetchSets())
      .put(FormLayoutActions.fetch())
      .put(FormLayoutActions.fetchSettings())
      .put(startInitialDataTaskQueueFulfilled())
      .run();
  });
});
