import type { AnyAction } from 'redux';

import { fetchFormDataSaga, watchFetchFormDataInitialSaga } from 'src/features/form/data/fetch/fetchFormDataSagas';
import { autoSaveSaga, saveFormDataSaga, submitFormSaga } from 'src/features/form/data/submit/submitFormDataSagas';
import { deleteAttachmentReferenceSaga, updateFormDataSaga } from 'src/features/form/data/update/updateFormDataSagas';
import { checkIfRuleShouldRunSaga } from 'src/features/form/rules/check/checkRulesSagas';
import { checkIfDataListShouldRefetchSaga } from 'src/shared/resources/dataLists/fetchDataListsSaga';
import { checkIfOptionsShouldRefetchSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { IFormData, IFormDataState } from 'src/features/form/data';
import type {
  IDeleteAttachmentReference,
  IFetchFormData,
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISaveAction,
  ISubmitDataAction,
  IUpdateFormData,
  IUpdateFormDataFulfilled,
} from 'src/features/form/data/formDataTypes';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';

export const initialState: IFormDataState = {
  formData: {},
  lastSavedFormData: {},
  unsavedChanges: false,
  saving: false,
  submittingId: '',
  savingId: '',
  error: null,
};

const isProcessAction = (action: AnyAction) =>
  action.type === ProcessActions.completeFulfilled.type || action.type === ProcessActions.completeRejected.type;

export const formDataSlice = createSagaSlice((mkAction: MkActionType<IFormDataState>) => ({
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
        state.lastSavedFormData = formData;
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
      takeEvery: submitFormSaga,
      reducer: (state, action) => {
        const { apiMode, componentId } = action.payload;
        state.savingId = apiMode !== 'Complete' ? componentId : state.savingId;
        state.submittingId = apiMode === 'Complete' ? componentId : state.submittingId;
      },
    }),
    savingStarted: mkAction<void>({
      reducer: (state) => {
        state.saving = true;
      },
    }),
    savingEnded: mkAction<{ model: IFormData }>({
      reducer: (state, action) => {
        state.saving = false;
        state.lastSavedFormData = action.payload.model;
      },
    }),
    submitFulfilled: mkAction<void>({
      reducer: (state) => {
        state.savingId = '';
        state.unsavedChanges = false;
      },
    }),
    submitRejected: mkAction<IFormDataRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
        state.submittingId = '';
        state.savingId = '';
      },
    }),
    update: mkAction<IUpdateFormData>({
      takeEvery: updateFormDataSaga,
    }),
    updateFulfilled: mkAction<IUpdateFormDataFulfilled>({
      takeLatest: [checkIfRuleShouldRunSaga, autoSaveSaga],
      takeEvery: [checkIfOptionsShouldRefetchSaga, checkIfDataListShouldRefetchSaga],
      reducer: (state, action) => {
        const { field, data, skipAutoSave } = action.payload;
        // Remove if data is null, undefined or empty string
        if (data === undefined || data === null || data === '') {
          delete state.formData[field];
        } else {
          state.formData[field] = data;
        }
        if (!skipAutoSave) {
          state.unsavedChanges = true;
        }
      },
    }),
    updateRejected: mkAction<IFormDataRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    save: mkAction<ISaveAction>({
      takeEvery: saveFormDataSaga,
    }),
    deleteAttachmentReference: mkAction<IDeleteAttachmentReference>({
      takeLatest: deleteAttachmentReferenceSaga,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(isProcessAction, (state) => {
        state.submittingId = '';
      })
      .addDefaultCase((state) => state);
  },
}));

export const FormDataActions = formDataSlice.actions;
