import { Action } from 'redux';
import * as ActionTypes from '../../formDesignerActionTypes';

export interface IDeleteApplicationMetadataAction extends Action {
  id: string;
}

export interface IDeleteApplicationMetadataActionRejected extends Action {
  error: Error;
}

export function deleteApplicationMetadataAction(id: string): IDeleteApplicationMetadataAction {
  return {
    type: ActionTypes.DELETE_APPLICATION_METADATA,
    id,
  };
}

export function
  deleteApplicationMetadataActionFulfilled(): Action {
  return {
    type: ActionTypes.DELETE_APPLICATION_METADATA_FULFILLED,
  };
}

export function deleteApplicationMetadataActionRejected(error: Error): IDeleteApplicationMetadataActionRejected {
  return {
    type: ActionTypes.DELETE_APPLICATION_METADATA_REJECTED,
    error,
  };
}
