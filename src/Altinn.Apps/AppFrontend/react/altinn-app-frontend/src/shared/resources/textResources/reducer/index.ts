import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { ITextResource } from '../../../../types/global';
import { IFetchTextResourcesFulfilled, IFetchTextResourcesRejected} from '../actions/fetch';
import * as ActionTypes from '../actions/types';

export interface ITextResourcesState {
  language: string;
  resources: ITextResource[];
}

const initialState: ITextResourcesState = {
  language: null,
  resources: [],
};

const TextResourcesReducer: Reducer<ITextResourcesState> = (
  state: ITextResourcesState = initialState,
  action?: Action,
): ITextResourcesState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_TEXT_RESOURCES_FULFILLED: {
      const { language, resources } = action as IFetchTextResourcesFulfilled;
      return update<ITextResourcesState>(state, {
        language: {
          $set: language,
        },
        resources: {
          $set: resources,
        },
      });
    }
    case ActionTypes.FETCH_TEXT_RESOURCES_REJECTED: {
      const { error } = action as IFetchTextResourcesRejected;
      return update<ITextResourcesState>(state, {
        error: {
          $set: error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default TextResourcesReducer;
