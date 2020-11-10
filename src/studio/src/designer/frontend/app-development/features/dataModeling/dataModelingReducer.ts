import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFetchDataModelFulfilled, ISetDataModelFilePath } from './dataModelingActions';
import * as ActionTypes from './dataModelingActionTypes';

export interface IDataModelingState {
  schema: any;
  filePath: string;
}

const initialState: IDataModelingState = {
  schema: {},
  filePath: undefined,
};

const dataModelingReducer: Reducer<IDataModelingState> = (
  state: IDataModelingState = initialState,
  action?: Action,
) => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_DATA_MODEL_FULFILLED: {
      const { schema } = action as IFetchDataModelFulfilled;
      return update<IDataModelingState>(state, {
        schema: {
          $set: schema,
        },
      });
    }

    case ActionTypes.SET_DATA_MODEL_FILE_PATH: {
      const { filePath } = action as ISetDataModelFilePath;
      return update<IDataModelingState>(state, {
        filePath: {
          $set: filePath,
        },
      });
    }

    default:
      return state;
  }
};

export default dataModelingReducer;
