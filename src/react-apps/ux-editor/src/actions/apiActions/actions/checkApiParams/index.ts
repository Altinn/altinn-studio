import { Action } from 'redux';
import * as ActionTypes from '../../apiActionTypes';

export interface ICheckIfApiShouldFetchAction extends Action {
  lastUpdatedComponentId: string;
  lastUpdatedDataBinding: IDataModelFieldElement;
  lastUpdatedDataValue: string;
  repeating: boolean,
  dataModelGroup?: string;
  index?: number;
}

export function checkIfApiShouldFetch(
  lastUpdatedComponentId: string,
  lastUpdatedDataBinding: IDataModelFieldElement,
  lastUpdatedDataValue: string,
  repeating: boolean,
  dataModelGroup?: string,
  index?: number
): ICheckIfApiShouldFetchAction {
  return {
    type: ActionTypes.CHECK_IF_API_SHOULD_FETCH,
    lastUpdatedDataBinding,
    lastUpdatedDataValue,
    lastUpdatedComponentId,
    repeating,
    dataModelGroup,
    index
  }
}