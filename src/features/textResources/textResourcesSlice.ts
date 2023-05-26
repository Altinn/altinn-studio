import { all, call, take, takeLatest } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { watchFetchTextResourcesSaga } from 'src/features/textResources/fetch/fetchTextResourcesSagas';
import { replaceTextResourcesSaga } from 'src/features/textResources/replace/replaceTextResourcesSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IFetchTextResourcesFulfilled,
  IFetchTextResourcesRejected,
  IReplaceTextResourcesFulfilled,
  IReplaceTextResourcesRejected,
  ITextResourcesState,
} from 'src/features/textResources/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

const initialState: ITextResourcesState = {
  language: null,
  resources: [],
  error: null,
};

export let TextResourcesActions: ActionsFromSlice<typeof textResourcesSlice>;
export const textResourcesSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ITextResourcesState>) => ({
    name: 'textResources',
    initialState,
    actions: {
      fetch: mkAction<void>({
        saga: () => watchFetchTextResourcesSaga,
      }),
      fetchFulfilled: mkAction<IFetchTextResourcesFulfilled>({
        reducer: (state, action) => {
          state.language = action.payload.language;
          state.resources = action.payload.resources;
        },
      }),
      fetchRejected: mkAction<IFetchTextResourcesRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
      replace: mkAction<void>({
        takeLatest: replaceTextResourcesSaga,
        saga: () =>
          function* (): SagaIterator {
            yield all([
              take(TextResourcesActions.fetchFulfilled),
              take(FormDataActions.fetchFulfilled),
              take(FormLayoutActions.initRepeatingGroupsFulfilled),
            ]);
            yield call(replaceTextResourcesSaga);
            yield takeLatest(FormDataActions.fetchFulfilled, replaceTextResourcesSaga);
            yield takeLatest(FormDataActions.updateFulfilled, replaceTextResourcesSaga);
            yield takeLatest(FormDataActions.setFulfilled, replaceTextResourcesSaga);
            yield takeLatest(TextResourcesActions.fetchFulfilled, replaceTextResourcesSaga);
            yield takeLatest(FormLayoutActions.initRepeatingGroupsFulfilled, replaceTextResourcesSaga);
          },
      }),
      replaceFulfilled: mkAction<IReplaceTextResourcesFulfilled>({
        reducer: (state, action) => {
          state.language = action.payload.language;
          state.resources = action.payload.resources;
        },
      }),
      replaceRejected: mkAction<IReplaceTextResourcesRejected>({
        reducer: (state, action) => {
          state.error = action.payload.error;
        },
      }),
    },
  }));

  TextResourcesActions = slice.actions;
  return slice;
};
