import { Action } from 'redux';
import * as ActionTypes from '../../formFillerActionTypes';

export interface IUpdateFormDataAction extends Action {
  formData: any;
  componentID: string;
  dataModelElement: IDataModelFieldElement;
}

export interface IUpdateFormDataActionFulfilled extends Action {
  formData: any;
  componentID: string;
  dataModelElement: IDataModelFieldElement;
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

): IUpdateFormDataAction {
  return {
    type: ActionTypes.UPDATE_FORM_DATA,
    formData,
    componentID,
    dataModelElement,
  };
}

export function updateFormDataActionFulfilled(
  componentID: string,
  formData: any,
  dataModelElement: IDataModelFieldElement,
  validationErrors: any[],
): IUpdateFormDataActionFulfilled {
  return {
    type: ActionTypes.UPDATE_FORM_DATA_FULFILLED,
    formData,
    componentID,
    dataModelElement,
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
