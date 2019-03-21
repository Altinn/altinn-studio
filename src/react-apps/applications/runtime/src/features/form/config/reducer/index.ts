import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from '../actions/types';
import {
  IFetchFormConfigFulfilled,
  IFetchFormConfigRejected,
} from '../actions/fetch';

export interface IFormConfigState {
  config: any;
  error: Error;
}

const initalState: IFormConfigState = {
  config: {},
  error: null,
};

const FormConfigReducer: Reducer<IFormConfigState> = (
  state: IFormConfigState = initalState,
  action?: Action,
): IFormConfigState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_FORM_CONFIG_FULFILLED: {
      const { config } = action as IFetchFormConfigFulfilled;
      return update<IFormConfigState>(state, {
        config: {
          $set: config,
        },
      });
    }
    case ActionTypes.FETCH_FORM_CONFIG_REJECTED: {
      const { error } = action as IFetchFormConfigRejected;
      return update<IFormConfigState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
}

export default FormConfigReducer;