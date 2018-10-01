import { Action } from 'redux';
import * as ActionTypes from '../../apiActionTypes';

export interface ICheckIfApiShouldFetchAction extends Action {
  lastUpdatedComponentId: string;
  lastUpdatedDataBinding: IDataModelFieldElement;
  lastUpdatedDataValue: string;
}

export function checkIfApiShouldFetch(lastUpdatedComponentId: string, lastUpdatedDataBinding: IDataModelFieldElement, lastUpdatedDataValue: string): ICheckIfApiShouldFetchAction {
  return {
    type: ActionTypes.CHECK_IF_API_SHOULD_FETCH,
    lastUpdatedDataBinding,
    lastUpdatedDataValue,
    lastUpdatedComponentId,
  }
}