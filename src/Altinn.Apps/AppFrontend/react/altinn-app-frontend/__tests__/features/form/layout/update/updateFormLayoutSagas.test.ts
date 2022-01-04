import { testSaga } from "redux-saga-test-plan";
import FormDataActions from "src/features/form/data/formDataActions";
import { FormLayoutActions } from "src/features/form/layout/formLayoutSlice";
import { initRepeatingGroupsSaga, watchInitRepeatingGroupsSaga } from "src/features/form/layout/update/updateFormLayoutSagas";

describe('features / form / layout / update / updateLayoutSagas', () => {
  it('watchInitRepeatingGroupsSaga should wait for layout, then wait trigger on relevant actions', () => {
    const saga = testSaga(watchInitRepeatingGroupsSaga)
    saga
      .next()
      .take(FormLayoutActions.fetchLayoutFulfilled)
      .next()
      .call(initRepeatingGroupsSaga)
      .next()
      .takeLatest([
        FormDataActions.fetchFormDataFulfilled,
        FormLayoutActions.initRepeatingGroups,
        FormLayoutActions.fetchLayoutFulfilled
        ],
        initRepeatingGroupsSaga
      )
      .next()
      .isDone();
  });
});
