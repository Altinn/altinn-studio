import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface ICodeListsState {
  codeLists: any;
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: ICodeListsState = {
  codeLists: null,
  fetching: false,
  fetched: false,
  error: null,
};

/**
 * The CodeList reducer. Responsible for oppdating the ICodeListState
 * @param state The state
 * @param action The action performed
 */
const codeListsReducer: Reducer<ICodeListsState> = (
  state: ICodeListsState = initialState,
  action?: Action,
): ICodeListsState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case AppDataActionTypes.FETCH_CODE_LISTS: {
      return update<ICodeListsState>(state, {
        fetched: {
          $set: false,
        },
        fetching: {
          $set: true,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppDataActionTypes.FETCH_CODE_LISTS_FULFILLED: {
      const { codeLists } = action as AppDataActions.IFetchCodeListsFulfilled;
      return update<ICodeListsState>(state, {
        codeLists: {
          $set: codeLists,
        },
        fetched: {
          $set: true,
        },
        fetching: {
          $set: false,
        },
        error: {
          $set: null,
        },
      });
    }
    case AppDataActionTypes.FETCH_CODE_LISTS_REJECTED: {
      const { error } = action as AppDataActions.IFetchCodeListsRejected;
      return update<ICodeListsState>(state, {
        error: {
          $set: error,
        },
        fetched: {
          $set: false,
        },
        fetching: {
          $set: false,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default codeListsReducer;
