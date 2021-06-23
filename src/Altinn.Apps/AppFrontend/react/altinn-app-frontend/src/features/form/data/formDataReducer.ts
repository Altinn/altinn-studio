import { AnyAction } from 'redux';
import { createReducer, PayloadAction } from '@reduxjs/toolkit';
import FormDataActions from './formDataActions';
import { FormLayoutActions } from '../layout/formLayoutSlice';
import * as ProcessActionTypes from '../../../shared/resources/process/processActionTypes';
import { IFetchFormDataFulfilled,
  IFormDataRejected,
  ISubmitDataAction,
  IUpdateFormDataFulfilled } from './formDataTypes';

export interface IFormData {
  [dataFieldKey: string]: any;
}

export interface IFormDataState {
  formData: IFormData;
  error: Error;
  responseInstance: any;
  unsavedChanges: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  hasSubmitted: boolean;
  ignoreWarnings: boolean;
}

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
  return action.type === ProcessActionTypes.COMPLETE_PROCESS_FULFILLED
    || action.type === ProcessActionTypes.COMPLETE_PROCESS_REJECTED;
};

const isUpdateDataFulfilled = (action: AnyAction) => {
  return action.type === FormDataActions.updateFormDataFulfilled.type
    || action.type === FormDataActions.updateFormDataSkipAutosave.type;
};

const FormDataReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(FormDataActions.fetchFormDataFulfilled, (state, action: PayloadAction<IFetchFormDataFulfilled>) => {
      const { formData } = action.payload;
      state.formData = formData;
    })
    .addCase(FormDataActions.setFormDataFulfilled, (state, action: PayloadAction<IFetchFormDataFulfilled>) => {
      const { formData } = action.payload;
      state.formData = formData;
    })
    .addCase(FormDataActions.fetchFormDataRejected, (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
    })
    .addCase(FormDataActions.submitFormData, (state, action: PayloadAction<ISubmitDataAction>) => {
      const { apiMode } = action.payload;
      state.isSaving = apiMode !== 'Complete';
      state.isSubmitting = apiMode === 'Complete';
      state.hasSubmitted = apiMode === 'Complete';
    })
    .addCase(FormDataActions.submitFormDataFulfilled, (state) => {
      state.isSaving = false;
      state.unsavedChanges = false;
    })
    .addCase(FormDataActions.submitFormDataRejected, (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
      state.isSubmitting = false;
      state.isSaving = false;
      state.ignoreWarnings = true;
    })
    .addCase(FormDataActions.updateFormData, (state) => {
      state.hasSubmitted = false;
      state.ignoreWarnings = false;
    })
    .addCase(FormDataActions.updateFormDataRejected, (state, action: PayloadAction<IFormDataRejected>) => {
      const { error } = action.payload;
      state.error = error;
    })
    .addCase(FormLayoutActions.updateCurrentView, (state) => {
      state.hasSubmitted = true;
    })
    .addCase(FormLayoutActions.updateCurrentViewFulfilled, (state) => {
      state.hasSubmitted = false;
    })
    .addMatcher(isUpdateDataFulfilled, (state, action: PayloadAction<IUpdateFormDataFulfilled>) => {
      const { field, data } = action.payload;
      // Remove if data is null, undefined or empty string
      if (data === undefined || data === null || data === '') {
        delete state.formData[field];
      } else {
        state.formData[field] = data;
      }
      state.unsavedChanges = true;
    })
    .addMatcher(isProcessAction, (state) => {
      state.isSubmitting = false;
    })
    .addDefaultCase((state) => state);
});

export default FormDataReducer;
