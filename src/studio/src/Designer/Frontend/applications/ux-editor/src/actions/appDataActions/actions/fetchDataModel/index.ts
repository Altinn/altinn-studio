import { Action } from 'redux';
import * as ActionTypes from '../../appDataActionTypes';

export interface IFetchDataModelAction extends Action {
  url: string;
}
export interface IFetchDataModelFulfilled extends Action {
  dataModel: IDataModelFieldElement[];
}
export interface IFetchDataModelRejected extends Action {
  error: Error;
}

export function fetchLayoutDataModelAction(url: string): IFetchDataModelAction {
  return {
    type: ActionTypes.FETCH_DATA_MODEL,
    url,
  };
}

export function fetchLayoutDataModelFulfilledAction(
  dataModel: IDataModelFieldElement[],
): IFetchDataModelFulfilled {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_FULFILLED,
    dataModel,
  };
}

export function fetchLayoutDataModelRejectedAction(
  error: Error,
): IFetchDataModelRejected {
  return {
    type: ActionTypes.FETCH_DATA_MODEL_REJECTED,
    error,
  };
}
