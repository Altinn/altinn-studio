import { IOptions } from 'src/types';
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
      const { optionsKey, optionData } = action as IFetchOptionsFulfilledAction;
      return update<IOptionsState>(state, {
        options: {
          [optionsKey]: { $set: optionData },
        },
      });
    }
    case FetchOptionsActionTypes.FETCH_OPTIONS_REJECTED: {
      const { optionsKey, error } = action as IFetchOptionsRejectedAction;
      return update<IOptionsState>(state, {
        options: {
          [optionsKey]: {
            loading: { $set: false }
          }
        },
        error: {
          $set: error,
        },
      });
    }

    case FetchOptionsActionTypes.FETCHING_OPTION: {
      const { optionsKey } = action as IFetchOptionsRejectedAction;
      if (state.options[optionsKey]) {
        return update<IOptionsState>(state, {
          options: {
            [optionsKey]: {
              loading: { $set: true },
            }
          },
        });
      } else {
        return update<IOptionsState>(state, {
          options: {
            [optionsKey]: { $set: {
              loading: true
            } },
          },
        });
      }
    }
    default: { return state; }
  }
};

export default OptionsReducer;
