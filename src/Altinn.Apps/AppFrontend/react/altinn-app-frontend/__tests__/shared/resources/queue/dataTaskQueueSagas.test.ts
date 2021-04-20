/* eslint-disable import/named */
import { expectSaga } from 'redux-saga-test-plan';
import { startInitialDataTaskQueueSaga } from '../../../../src/shared/resources/queue/dataTask/dataTaskQueueSagas';
import { startInitialDataTaskQueueFulfilled } from '../../../../src/shared/resources/queue/queueSlice';
import FormDataActions from '../../../../src/features/form/data/formDataActions';
import { fetchJsonSchema } from '../../../../src/features/form/datamodel/datamodelSlice';
import { FormLayoutActions } from '../../../../src/features/form/layout/formLayoutSlice';

describe('dataTaskQueueSagas', () => {
  it('startInitialAppTaskQueueSaga, app queue is started', () => {
    return expectSaga(startInitialDataTaskQueueSaga)
      .put(FormDataActions.fetchFormDataInitial())
      .put(fetchJsonSchema())
      .put(FormLayoutActions.fetchLayoutSets())
      .put(FormLayoutActions.fetchLayout())
      .put(FormLayoutActions.fetchLayoutSettings())
      .put(startInitialDataTaskQueueFulfilled())
      .run();
  });
});
