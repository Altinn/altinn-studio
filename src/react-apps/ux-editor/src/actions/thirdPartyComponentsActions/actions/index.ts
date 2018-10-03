import { Action } from 'redux';
import * as ActionTypes from '../thirdPartyComponentsActionTypes';

export interface IFetchThirdPartyComponent extends Action {
  location: string;
  components: string[];
}

export interface IFetchThirdPartyComponentFulfilled extends Action {
  components: any;
}

export interface IFetchThirdPartyComponentRejected extends Action {
  error: Error;
}

export function fetchThirdPartyComponents(location: string, components: string[]): IFetchThirdPartyComponent {
  return {
    type: ActionTypes.FETCH_THIRD_PARTY_COMPONENTS,
    location,
    components,
  }
}

export function fetchThirdPartyComponentsFulfilled(components: any): IFetchThirdPartyComponentFulfilled {
  return {
    type: ActionTypes.FETCH_THIRD_PARTY_COMPONENTS_FULFILLED,
    components,
  }
}

export function fetchThirdPartyComponentsRejected(error: Error): IFetchThirdPartyComponentRejected {
  return {
    type: ActionTypes.FETCH_THIRD_PARTY_COMPONENTS_REJECTED,
    error,
  }
}