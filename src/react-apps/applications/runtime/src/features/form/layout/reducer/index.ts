import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from '../actions/types';
import {
  IFetchFormLayoutFulfilled,
  IFetchFormLayoutRejected
} from '../actions/fetch';

export interface ILayoutState {
  components: any;
  containers: any;
  order: any;
  error: Error;
};

const initialState: ILayoutState = {
  components: null,
  containers: null,
  order: null,
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
      const { components, containers, order } = action as IFetchFormLayoutFulfilled;
      return update<ILayoutState>(state, {
        components: {
          $set: components,
        },
        containers: {
          $set: containers,
        },
        order: {
          $set: order,
        },
        error: {
          $set: null,
        },
      });
    }
    case ActionTypes.FETCH_FORM_LAYOUT_REJECTED: {
      const { error } = action as IFetchFormLayoutRejected;
      return update<ILayoutState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    };
  }
}

export default LayoutReducer;
