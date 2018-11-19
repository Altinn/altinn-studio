import { Action } from 'redux';
import * as ActionTypes from '../../appDataActionTypes';

/**
 * Defines the action datamodel for triggeren FetchCodeListsAction
 * (Finding a list over all code lists)
 */
export interface IFetchCodeListsAction extends Action {
  url: string;
}

/**
 * Defines the action datamodel for FetchCodeListFullfilled action
 */
export interface IFetchCodeListsFulfilled extends Action {
  codeLists: ICodeListListElement[];
}

/**
 * Defines the action datamodel for the FetchCodeListRejected action
 */
export interface IFetchCodeListsRejected extends Action {
  error: Error;
}

/**
 * Action creator
 * @param codeList
 */
export function fetchCodeListsAction(url: string): IFetchCodeListsAction {
  return {
    type: ActionTypes.FETCH_CODE_LISTS,
    url,
  };
}

/**
 * Action creator for fetchCodeListFulFilledAction
 * This action is called when SAGA has received codeList from API
 * @param codeList the codeList retrived from API
 */
export function fetchCodeListsFulfilledAction(
  codeLists: any,
): IFetchCodeListsFulfilled {
  return {
    type: ActionTypes.FETCH_CODE_LISTS_FULFILLED,
    codeLists,
  };
}

/**
 * Action Creator for the fetchCodeListReject
 * @param error
 */
export function fetchCodeListsRejectedAction(
  error: Error,
): IFetchCodeListsRejected {
  return {
    type: ActionTypes.FETCH_CODE_LISTS_REJECTED,
    error,
  };
}
