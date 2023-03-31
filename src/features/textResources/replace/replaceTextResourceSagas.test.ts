import { take } from 'redux-saga/effects';
import { testSaga } from 'redux-saga-test-plan';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import {
  replaceTextResourcesSaga,
  watchReplaceTextResourcesSaga,
} from 'src/features/textResources/replace/replaceTextResourcesSagas';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';

describe('watchReplaceTextResourcesSaga', () => {
  it('should wait for required data then take latest for relevant actions', () => {
    const saga = testSaga(watchReplaceTextResourcesSaga);
    saga
      .next()
      .all([
        take(TextResourcesActions.fetchFulfilled),
        take(FormDataActions.fetchFulfilled),
        take(FormLayoutActions.updateRepeatingGroupsFulfilled),
      ])
      .next()
      .call(replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.fetchFulfilled, replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.updateFulfilled, replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.setFulfilled, replaceTextResourcesSaga)
      .next()
      .takeLatest(TextResourcesActions.fetchFulfilled, replaceTextResourcesSaga)
      .next()
      .isDone();
  });
});
