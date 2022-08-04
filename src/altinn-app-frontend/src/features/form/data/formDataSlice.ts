import type { AnyAction } from 'redux';

import {
  fetchFormDataSaga,
  watchFetchFormDataInitialSaga,
} from 'src/features/form/data/fetch/fetchFormDataSagas';
import {
  autoSaveSaga,
  saveFormDataSaga,
  submitFormSaga,
} from 'src/features/form/data/submit/submitFormDataSagas';
import {
  deleteAttachmentReferenceSaga,
  updateFormDataSaga,
} from 'src/features/form/data/update/updateFormDataSagas';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { checkIfRuleShouldRunSaga } from 'src/features/form/rules/check/checkRulesSagas';
import { checkIfOptionsShouldRefetchSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { IFormDataState } from 'src/features/form/data';
import type {
  IDeleteAttachmentReference,
  IFetchFormData,
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISubmitDataAction,
  IUpdateFormData,
  IUpdateFormDataFulfilled,
} from 'src/features/form/data/formDataTypes';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

const initialState: IFormDataState = {
  formData: {},
  error: null,
  responseInstance: null,
  unsavedChanges: false,
  isSubmitting: false,
  isSaving: false,
  hasSubmitted: false,
  ignoreWarnings: false,
};

const isProcessAction = (action: AnyAction) => {
  return (
    action.type === ProcessActions.completeFulfilled.type ||
    action.type === ProcessActions.completeRejected.type
  );
};

const formDataSlice = createSagaSlice(
  (mkAction: MkActionType<IFormDataState>) => ({
    name: 'formData',
    initialState,
    actions: {
      fetch: mkAction<IFetchFormData>({
        takeLatest: fetchFormDataSaga,
      }),
      fetchInitial: mkAction<void>({
        saga: () => watchFetchFormDataInitialSaga,
      }),
      fetchFulfilled: mkAction<IFetchFormDataFulfilled>({
        reducer: (state, action) => {
          const { formData } = action.payload;
          state.formData = formData;
        },
      }),
      fetchRejected: mkAction<IFormDataRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
      setFulfilled: mkAction<IFetchFormDataFulfilled>({
        reducer: (state, action) => {
          const { formData } = action.payload;
          state.formData = formData;
        },
      }),
      submit: mkAction<ISubmitDataAction>({
        takeLatest: submitFormSaga,
        reducer: (state, action) => {
          const { apiMode } = action.payload;
          state.isSaving = apiMode !== 'Complete';
          state.isSubmitting = apiMode === 'Complete';
          state.hasSubmitted = apiMode === 'Complete';
        },
      }),
      submitFulfilled: mkAction<void>({
        reducer: (state) => {
          state.isSaving = false;
          state.unsavedChanges = false;
        },
      }),
      submitRejected: mkAction<IFormDataRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
          state.isSubmitting = false;
          state.isSaving = false;
          state.ignoreWarnings = true;
        },
      }),
      update: mkAction<IUpdateFormData>({
        takeEvery: updateFormDataSaga,
        reducer: (state) => {
          state.hasSubmitted = false;
          state.ignoreWarnings = false;
        },
      }),
      updateFulfilled: mkAction<IUpdateFormDataFulfilled>({
        takeLatest: [checkIfRuleShouldRunSaga, autoSaveSaga],
        takeEvery: checkIfOptionsShouldRefetchSaga,
        reducer: (state, action) => {
          const { field, data } = action.payload;
          // Remove if data is null, undefined or empty string
          if (data === undefined || data === null || data === '') {
            delete state.formData[field];
          } else {
            state.formData[field] = data;
          }
          state.unsavedChanges = true;
        },
      }),
      updateRejected: mkAction<IFormDataRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
        },
      }),
      save: mkAction<void>({
        takeLatest: saveFormDataSaga,
      }),
      deleteAttachmentReference: mkAction<IDeleteAttachmentReference>({
        takeLatest: deleteAttachmentReferenceSaga,
      }),
    },
    extraReducers: (builder) => {
      builder
        .addCase(FormLayoutActions.updateCurrentView, (state) => {
          state.hasSubmitted = true;
        })
        .addCase(FormLayoutActions.updateCurrentViewFulfilled, (state) => {
          state.hasSubmitted = false;
        })
        .addMatcher(isProcessAction, (state) => {
          state.isSubmitting = false;
        })
        .addDefaultCase((state) => state);
    },
  }),
);

export const FormDataActions = formDataSlice.actions;
export default formDataSlice;
