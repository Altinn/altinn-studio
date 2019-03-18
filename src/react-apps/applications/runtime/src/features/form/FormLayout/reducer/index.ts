import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from '../actions/types';
import {
  IFetchFormLayoutFulfilled,
  IFetchFormLayoutRejected
} from '../actions/fetch';

export interface ILayoutState {
  formLayout: any;
  error: Error;
};

const initialState: ILayoutState = {
  formLayout: [],
  error: null,
};

const LayoutReducer: Reducer<ILayoutState> = (
  state: ILayoutState = initialState,
  action?: Action,
): ILayoutState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_FORM_LAYOUT_FULFILLED: {
      const { formLayout } = action as IFetchFormLayoutFulfilled;
      return update<ILayoutState>(state, {
        $set: {
          formLayout,
          error: null,
        },
      });
    }
    case ActionTypes.FETCH_FORM_LAYOUT_REJECTED: {
      const { error } = action as IFetchFormLayoutRejected;
      return update<ILayoutState>(state, {
        $set: {
          formLayout: state.formLayout,
          error,
        },
      });
    }
    default: {
      return state;
    };
  }
}

export default LayoutReducer;