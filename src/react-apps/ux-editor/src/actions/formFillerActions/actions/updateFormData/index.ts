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
  validationErrors: any[];
}

export interface IUpdateValidationErrors extends Action {
  validationErrors: {};
}

export interface IUpdateFormDataActionRejected extends Action {
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
  validationErrors: any[],
): IUpdateFormDataActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_DATA_FULFILLED,
    formData,
    componentID,
    dataModelBinding,
    validationErrors,
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
