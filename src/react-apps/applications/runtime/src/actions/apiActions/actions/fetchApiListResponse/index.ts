import { Action } from 'redux';
import * as ActionTypes from '../../apiActionTypes';

export interface IFetchApiListResponseAction extends Action { }

export function fetchApiListResponse(): IFetchApiListResponseAction {
  return {
    type: ActionTypes.FETCH_API_LIST_RESPONSE,
  };
}
