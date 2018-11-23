import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as AppDataActions from '../../actions/appDataActions/actions';
import * as AppDataActionTypes from '../../actions/appDataActions/appDataActionTypes';

export interface IDataModelState {
  model: IDataModelFieldElement[];
  fetching: boolean;
  fetched: boolean;
  error: Error;
}

const initialState: IDataModelState = {
  model: [],
  fetching: false,
  fetched: false,
  error: null,
};

const dataModelReducer: Reducer<IDataModelState> = (
  state: IDataModelState = initialState,
  action?: Action,
): IDataModelState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case AppDataActionTypes.FETCH_DATA_MODEL: {
      return update<IDataModelState>(state, {
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
    case AppDataActionTypes.FETCH_DATA_MODEL_FULFILLED: {
      const { dataModel } = action as AppDataActions.IFetchDataModelFulfilled;
      return update<IDataModelState>(state, {
        model: {
          $set: dataModel,
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
    case AppDataActionTypes.FETCH_DATA_MODEL_REJECTED: {
      const { error } = action as AppDataActions.IFetchDataModelRejected;
      return update<IDataModelState>(state, {
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

export default dataModelReducer;
