import { Action } from 'redux';
import { ILayout } from '..';
import * as actionTypes from '../formLayoutActionTypes';

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
  layout: ILayout;
}

export function fetchFormLayoutFulfilled(layout: ILayout): IFetchFormLayoutFulfilled {
  return {
    type: actionTypes.FETCH_FORM_LAYOUT_FULFILLED,
    layout,
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
