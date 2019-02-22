import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IUpdateDataModelBindingAction extends Action {
  id: string;
  dataModelBinding: string;
}

export interface IUpdateDataModelBindingActionFulfilled extends Action {
  id: string;
  dataModelBinding: string;
}

export interface IUpdateDataModelBindingActionRejected extends Action {
  error: Error;
}

export function updateDataModelBindingAction(
  id: string,
  dataModelBinding: string,
): IUpdateDataModelBindingAction {
  return {
    type: ActionTypes.UPDATE_DATA_MODEL_BINDING,
    id,
    dataModelBinding,
  };
}

export function updateDataModelBindingActionFulfilled(
  id: string,
  dataModelBinding: string,
): IUpdateDataModelBindingActionFulfilled {
  return {
    type: ActionTypes.UPDATE_DATA_MODEL_BINDING_DONE,
    id,
    dataModelBinding,
  };
}

export function updateDataModelBindingActionRejected(error: Error): IUpdateDataModelBindingActionRejected {
  return {
    type: ActionTypes.UPDATE_DATA_MODEL_BINDING_DONE,
    error,
  };
}
