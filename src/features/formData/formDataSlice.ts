import type { AnyAction } from 'redux';

import { checkIfDataListShouldRefetchSaga } from 'src/features/dataLists/fetchDataListsSaga';
import { fetchFormDataSaga, watchFetchFormDataInitialSaga } from 'src/features/formData/fetch/fetchFormDataSagas';
import { autoSaveSaga, saveFormDataSaga, submitFormSaga } from 'src/features/formData/submit/submitFormDataSagas';
import { deleteAttachmentReferenceSaga, updateFormDataSaga } from 'src/features/formData/update/updateFormDataSagas';
import { checkIfRuleShouldRunSaga } from 'src/features/formRules/checkRulesSagas';
import { checkIfOptionsShouldRefetchSaga } from 'src/features/options/fetch/fetchOptionsSagas';
import { ProcessActions } from 'src/features/process/processSlice';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type {
  IDeleteAttachmentReference,
  IFetchFormData,
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISaveAction,
  ISubmitDataAction,
  IUpdateFormData,
} from 'src/features/formData/formDataTypes';
import type { IFormData, IFormDataState } from 'src/features/formData/index';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IFormDataState = {
  formData: {},
  lastSavedFormData: {},
  unsavedChanges: false,
  saving: false,
  submittingId: '',
  error: null,
};

const isProcessAction = (action: AnyAction) =>
  action.type === ProcessActions.completeFulfilled.type || action.type === ProcessActions.completeRejected.type;

export let FormDataActions: ActionsFromSlice<typeof formDataSlice>;
export const formDataSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IFormDataState>) => ({
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
          const { componentId } = action.payload;
          state.submittingId = componentId;
        },
      }),
      submitFulfilled: mkAction<void>({
        reducer: (state) => {
          state.unsavedChanges = false;
        },
      }),
      submitRejected: mkAction<IFormDataRejected>({
        reducer: (state, action) => {
          const { error } = action.payload;
          state.error = error;
          state.submittingId = '';
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
      update: mkAction<IUpdateFormData>({
        takeEvery: updateFormDataSaga,
      }),
      updateFulfilled: mkAction<IUpdateFormData>({
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
      saveEvery: mkAction<ISaveAction>({
        takeEvery: saveFormDataSaga,
      }),
      saveLatest: mkAction<ISaveAction>({
        takeLatest: saveFormDataSaga,
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

  FormDataActions = slice.actions;
  return slice;
};
