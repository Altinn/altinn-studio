import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface ITextResourcesState {
  resources: ITextResource[];
  language: string;
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: ITextResourcesState = {
  resources: [],
  language: null,
  fetching: false,
  fetched: false,
  error: null,
};

const textResourcesReducer: Reducer<ITextResourcesState> = (
  state: ITextResourcesState = initialState,
  action?: Action,
): ITextResourcesState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case AppDataActionTypes.LOAD_TEXT_RESOURCES: {
      return update<ITextResourcesState>(state, {
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
    case AppDataActionTypes.LOAD_TEXT_RESOURCES_FULFILLED: {
      const { textResources } = action as AppDataActions.ILoadTextResourcesFulfilled;
      return update<ITextResourcesState>(state, {
        resources: {
          $set: textResources.resources,
        },
        language: {
          $set: textResources.language,
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
    case AppDataActionTypes.LOAD_TEXT_RESOURCES_REJECTED: {
      const { error } = action as AppDataActions.IFetchDataModelRejected;
      return update<ITextResourcesState>(state, {
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

export default textResourcesReducer;
