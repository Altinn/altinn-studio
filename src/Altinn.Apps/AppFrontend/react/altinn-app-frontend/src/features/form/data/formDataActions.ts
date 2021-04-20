import { createAction } from '@reduxjs/toolkit';
import { IFetchFormData,
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISubmitDataAction,
  IUpdateFormData,
  IUpdateFormDataFulfilled } from './formDataTypes';

const moduleName = 'formData';
const FormDataActions = {
  fetchFormData: createAction<IFetchFormData>(`${moduleName}/fetch`),
  fetchFormDataFulfilled: createAction<IFetchFormDataFulfilled>(`${moduleName}/fetchFulfilled`),
  fetchFormDataInitial: createAction(`${moduleName}/fetchInitial`),
  fetchFormDataRejected: createAction<IFormDataRejected>(`${moduleName}/fetchRejected`),
  saveFormData: createAction(`${moduleName}/save`),
  submitFormData: createAction<ISubmitDataAction>(`${moduleName}/submit`),
  submitFormDataFulfilled: createAction(`${moduleName}/submitFulfilled`),
  submitFormDataRejected: createAction<IFormDataRejected>(`${moduleName}/submitRejected`),
  updateFormData: createAction<IUpdateFormData>(`${moduleName}/update`),
  updateFormDataFulfilled: createAction<IUpdateFormDataFulfilled>(`${moduleName}/updateFulfilled`),
  updateFormDataSkipAutosave: createAction<IUpdateFormDataFulfilled>(`${moduleName}/updateSkipAutosave`),
  updateFormDataRejected: createAction<IFormDataRejected>(`${moduleName}/updateRejected`),
};

export default FormDataActions;
