import { Action } from 'redux';
import * as actionTypes from '../types';

export interface IFetchFormLayout extends Action {
  url: string;
}

export function fetchFormLayout(url: string): IFetchFormLayout {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT,
    url,
  };
}

export interface IFetchFormLayoutFulfilled extends Action {
  components: any;
  containers: any;
  order: any;
}

export function fetchFormLayoutFulfilled(components: any, containers: any, order: any): IFetchFormLayoutFulfilled {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_FULFILLED,
    components,
    containers,
    order,
  };
}

export interface IFetchFormLayoutRejected extends Action {
  error: Error;
}

export function fetchFormLayoutRejected(error: Error): IFetchFormLayoutRejected {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_REJECTED,
    error,
  };
}
