import type { IOptions } from 'src/types';
import type { Action, Reducer } from 'redux';
import update from 'immutability-helper';
import * as FetchOptionsActionTypes from './fetch/fetchOptionsActionTypes';
import type {
  IFetchOptionsFulfilledAction,
  IFetchOptionsRejectedAction,
  IFetchingOptionsAction,
} from './fetch/fetchOptionsActions';

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
      const { optionsKey, options } = action as IFetchOptionsFulfilledAction;
      return update<IOptionsState>(state, {
        options: {
          [optionsKey]: {
            loading: { $set: false },
            options: { $set: options },
          },
        },
      });
    }
    case FetchOptionsActionTypes.FETCH_OPTIONS_REJECTED: {
      const { optionsKey, error } = action as IFetchOptionsRejectedAction;
      return update<IOptionsState>(state, {
        options: {
          [optionsKey]: {
            loading: { $set: false },
          },
        },
        error: {
          $set: error,
        },
      });
    }

    case FetchOptionsActionTypes.FETCHING_OPTION: {
      const { optionsKey, optionMetaData } = action as IFetchingOptionsAction;
      if (state.options[optionsKey]) {
        return update<IOptionsState>(state, {
          options: {
            [optionsKey]: {
              $merge: {
                ...optionMetaData,
                loading: true,
              },
            },
          },
        });
      }
      return update<IOptionsState>(state, {
        options: {
          [optionsKey]: {
            $set: {
              ...optionMetaData,
              loading: true,
            },
          },
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default OptionsReducer;
