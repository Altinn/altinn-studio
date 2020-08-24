import { Action } from 'redux';
import * as ActionTypes from '../formDynamicsActionTypes';

export interface ICheckIfApiShouldFetchAction extends Action {
  updatedComponentId: string;
  updatedDataField: string;
  updatedData: string;
  repeating: boolean;
  dataModelGroup?: string;
  index?: number;
}

export function checkIfApiShouldFetch(
  updatedComponentId: string,
  updatedDataField: string,
  updatedData: string,
  repeating: boolean,
  dataModelGroup?: string,
  index?: number,
): ICheckIfApiShouldFetchAction {
  return {
    type: ActionTypes.CHECK_IF_API_ACTIONS_SHOULD_RUN,
    updatedComponentId,
    updatedDataField,
    updatedData,
    repeating,
    dataModelGroup,
    index,
  };
}
