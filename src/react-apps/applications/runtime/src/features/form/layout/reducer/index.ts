import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import {
  ILayout,
} from '../';
import {
  IFetchFormLayoutFulfilled,
  IFetchFormLayoutRejected,
} from '../actions/fetch';
import * as ActionTypes from '../actions/types';
import { IUpdateFormLayout } from '../actions/update';

export interface ILayoutState {
  layout: ILayout;
  error: Error;
}

const initialState: ILayoutState = {
  layout: null,
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
      const { layout } = action as IFetchFormLayoutFulfilled;
      return update<ILayoutState>(state, {
        layout: {
          $set: layout,
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
    case ActionTypes.UPDATE_FORM_LAYOUT: {
      const { layoutElement, index } = action as IUpdateFormLayout;
      return update<ILayoutState>(state, {
        layout: {
          [index]: {
            $set: layoutElement,
          },
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default LayoutReducer;
