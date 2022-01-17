import { testSaga } from "redux-saga-test-plan";
import { take } from "redux-saga/effects";
import FormDataActions from "src/features/form/data/formDataActions";
import { FormLayoutActions } from "src/features/form/layout/formLayoutSlice";
import { FETCH_TEXT_RESOURCES_FULFILLED } from "src/shared/resources/textResources/fetch/fetchTextResourcesActionTypes";
import { replaceTextResourcesSaga, watchReplaceTextResourcesSaga } from "src/shared/resources/textResources/replace/replaceTextResourcesSagas";

describe('resources > textResources > replaceTextResourcesSagas', () => {
  it('watchReplaceTextResourcesSaga should wait for required data then take latest for relevant actions', () => {
    const saga = testSaga(watchReplaceTextResourcesSaga)
    saga
      .next()
      .all([
        take(FETCH_TEXT_RESOURCES_FULFILLED),
        take(FormDataActions.fetchFormDataFulfilled),
        take(FormLayoutActions.updateRepeatingGroupsFulfilled),
      ])
      .next()
      .call(replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.fetchFormDataFulfilled, replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.updateFormDataFulfilled, replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.updateFormDataSkipAutosave, replaceTextResourcesSaga)
      .next()
      .takeLatest(FormDataActions.setFormDataFulfilled, replaceTextResourcesSaga)
      .next()
      .isDone();
  });
});
