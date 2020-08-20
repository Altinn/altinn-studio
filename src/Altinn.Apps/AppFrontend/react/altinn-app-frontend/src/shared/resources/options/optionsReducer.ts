import { IOptions } from 'src/types/global';
import { Action, Reducer } from 'redux';
import update from 'immutability-helper';
import * as FetchOptionsActionTypes from './fetch/fetchOptionsActionTypes';
import { IFetchOptionsFulfilledAction, IFetchOptionsRejectedAction } from './fetch/fetchOptionsActions';

export interface IOptionsState {
  error: Error;
  options: IOptions;
}

const initialState: IOptionsState = {
  options: {},
  error: null,
};

const OptionsReducer: Reducer<IOptionsState> = (
  state: IOptionsState = initialState,
  action?: Action,
): IOptionsState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case FetchOptionsActionTypes.FETCH_OPTIONS_FULFILLED: {
      const { optionsId, options } = action as IFetchOptionsFulfilledAction;
      return update<IOptionsState>(state, {
        options: {
          [optionsId]: { $set: options },
        },
      });
    }
    case FetchOptionsActionTypes.FETCH_OPTIONS_REJECTED: {
      const { error } = action as IFetchOptionsRejectedAction;
      return update<IOptionsState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: { return state; }
  }
};

export default OptionsReducer;
