import { createAction } from "@reduxjs/toolkit";
import type {
  IFetchFormData,
  IFetchFormDataFulfilled,
  IFormDataRejected,
  ISubmitDataAction,
  IUpdateFormData,
  IUpdateFormDataFulfilled,
  IDeleteAttachmentReference,
} from "./formDataTypes";

const moduleName = "formData";
const FormDataActions = {
  fetchFormData: createAction<IFetchFormData>(`${moduleName}/fetch`),
  fetchFormDataFulfilled: createAction<IFetchFormDataFulfilled>(
    `${moduleName}/fetchFulfilled`
  ),
  fetchFormDataInitial: createAction(`${moduleName}/fetchInitial`),
  fetchFormDataRejected: createAction<IFormDataRejected>(
    `${moduleName}/fetchRejected`
  ),
  saveFormData: createAction(`${moduleName}/save`),
  setFormDataFulfilled: createAction<IFetchFormDataFulfilled>(
    `${moduleName}/setFormDataFulfilled`
  ),
  submitFormData: createAction<ISubmitDataAction>(`${moduleName}/submit`),
  submitFormDataFulfilled: createAction(`${moduleName}/submitFulfilled`),
  submitFormDataRejected: createAction<IFormDataRejected>(
    `${moduleName}/submitRejected`
  ),
  updateFormData: createAction<IUpdateFormData>(`${moduleName}/update`),
  updateFormDataFulfilled: createAction<IUpdateFormDataFulfilled>(
    `${moduleName}/updateFulfilled`
  ),
  updateFormDataSkipAutosave: createAction<IUpdateFormDataFulfilled>(
    `${moduleName}/updateSkipAutosave`
  ),
  updateFormDataRejected: createAction<IFormDataRejected>(
    `${moduleName}/updateRejected`
  ),
  deleteAttachmentReference: createAction<IDeleteAttachmentReference>(
    `${moduleName}/deleteAttachmentReference`
  ),
};

export default FormDataActions;
