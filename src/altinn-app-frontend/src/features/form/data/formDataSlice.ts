import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import type {
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISubmitDataAction,
  IUpdateFormDataFulfilled,
  IFetchFormData,
  IDeleteAttachmentReference,
  IUpdateFormData,
} from 'src/features/form/data/formDataTypes';
import type { IFormDataState } from 'src/features/form/data/index';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import type { AnyAction } from 'redux';
import { ProcessActions } from 'src/shared/resources/process/processSlice';

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

const name = 'formData';
const formDataSlice = createSlice({
  name,
  initialState,
  reducers: {
    fetchFulfilled: (state, action: PayloadAction<IFetchFormDataFulfilled>) => {
      const { formData } = action.payload;
      state.formData = formData;
    },
    setFulfilled: (state, action: PayloadAction<IFetchFormDataFulfilled>) => {
      const { formData } = action.payload;
      state.formData = formData;
    },
    fetchRejected: (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    submit: (state, action: PayloadAction<ISubmitDataAction>) => {
      const { apiMode } = action.payload;
      state.isSaving = apiMode !== 'Complete';
      state.isSubmitting = apiMode === 'Complete';
      state.hasSubmitted = apiMode === 'Complete';
    },
    submitFulfilled: (state) => {
      state.isSaving = false;
      state.unsavedChanges = false;
    },
    submitRejected: (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.isSubmitting = false;
      state.isSaving = false;
      state.ignoreWarnings = true;
    },
    // The _action parameter is unused, but these parameters are used by TypeScript to infer the payload type for
    // this action, so we need to keep it here even if we only read it in the saga.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update: (state, _action: PayloadAction<IUpdateFormData>) => {
      state.hasSubmitted = false;
      state.ignoreWarnings = false;
    },
    updateFulfilled: (
      state,
      action: PayloadAction<IUpdateFormDataFulfilled>,
    ) => {
      const { field, data } = action.payload;
      // Remove if data is null, undefined or empty string
      if (data === undefined || data === null || data === '') {
        delete state.formData[field];
      } else {
        state.formData[field] = data;
      }
      state.unsavedChanges = true;
    },
    updateRejected: (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
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
});

const actions = {
  fetch: createAction<IFetchFormData>(`${name}/fetch`),
  fetchInitial: createAction(`${name}/fetchInitial`),
  save: createAction(`${name}/save`),
  deleteAttachmentReference: createAction<IDeleteAttachmentReference>(
    `${name}/deleteAttachmentReference`,
  ),
};

export const FormDataActions = {
  ...formDataSlice.actions,
  ...actions,
};
export default formDataSlice;
