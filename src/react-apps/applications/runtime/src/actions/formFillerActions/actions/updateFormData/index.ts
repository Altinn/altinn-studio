import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface IUpdateFormDataAction extends Action {
  formData: any;
  componentID: string;
  dataModelElement: IDataModelFieldElement;
  dataModelBinding?: string;
}

export interface IUpdateFormDataActionFulfilled extends Action {
  formData: any;
  componentID: string;
  dataModelBinding: string;
  validationResults: IComponentValidations;
}

export interface IUpdateValidationResults extends Action {
  validationResults: IValidationResults;
}

export interface IUpdateFormDataActionRejected extends Action {
  error: Error;
}
export interface IResetFormDataAction extends Action {
  url: string;
}
export interface IResetFormDataActionFulfilled extends Action {
  formData: any;
}
export interface IResetFormDataActionRejected extends Action {
  error: Error;
}

export function updateFormDataAction(
  componentID: string,
  formData: any,
  dataModelElement: IDataModelFieldElement,
  dataModelBinding?: string,

): IUpdateFormDataAction {
  return {
    type: ActionTypes.UPDATE_FORM_DATA,
    formData,
    componentID,
    dataModelElement,
    dataModelBinding,
  };
}

export function updateFormDataActionFulfilled(
  componentID: string,
  formData: any,
  dataModelBinding: string,
  validationResults: IComponentValidations,
): IUpdateFormDataActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_DATA_FULFILLED,
    formData,
    componentID,
    dataModelBinding,
    validationResults,
  };
}

export function updateFormDataActionRejected(
  error: Error,
): IUpdateFormDataActionRejected {
  return {
    type: ActionTypes.UPDATE_FORM_DATA_FULFILLED,
    error,
  };
}
// reset formdata
export function resetFormDataAction(url: string): IResetFormDataAction {
  return {
    type: ActionTypes.RESET_FORM_DATA,
    url,
  };
}

export function resetFormDataFulfilled(formData: any): IResetFormDataActionFulfilled {
  return {
    type: ActionTypes.RESET_FORM_DATA_FULFILLED,
    formData,
  };
}
export function resetFormDataActionRejected(
  error: Error,
): IResetFormDataActionRejected {
  return {
    type: ActionTypes.RESET_FORM_DATA_REJECTED,
    error,
  };
}
