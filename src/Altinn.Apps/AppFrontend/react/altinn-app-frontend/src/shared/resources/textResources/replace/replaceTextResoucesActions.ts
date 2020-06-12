import { Action } from 'redux';
import * as ActionTypes from './replaceTextResourcesActionTypes';
import { ITextResource } from '../../../../types/global';

export interface IReplaceTextResourcesFulfilled extends Action {
  language: string;
  resources: ITextResource[];
}

export interface IReplaceTextResourcesRejected extends Action {
  error: Error;
}

export function replaceTextResources(): Action {
  return {
    type: ActionTypes.REPLACE_TEXT_RESOURCES,
  };
}

export function replaceFormResourceFulfilled(
  language: string,
  resources: ITextResource[],
): IReplaceTextResourcesFulfilled {
  return {
    type: ActionTypes.REPLACE_TEXT_RESOURCES_FULFILLED,
    language,
    resources,
  };
}

export function replaceFormResourceRejected(error: Error): IReplaceTextResourcesRejected {
  return {
    type: ActionTypes.REPLACE_TEXT_RESOURCES_REJECTED,
    error,
  };
}
