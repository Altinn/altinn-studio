import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IDataModelFieldElement } from '../../../types';
import { IFetchDataModelFulfilled,
  IFetchDataModelRejected,
  IFetchJsonSchemaFulfilled } from './fetch/fetchFormDatamodelActions';
import * as ActionTypes from './fetch/fetchFormDatamodelActionTypes';

export interface IJsonSchemas {
  [id: string]: any;
}

export interface IDataModelState {
  dataModel: IDataModelFieldElement[];
  schemas: IJsonSchemas;
  error: Error;
}

const initialState: IDataModelState = {
  dataModel: [],
  schemas: {},
  error: null,
};

const DataModelReducer: Reducer<IDataModelState> = (
  state: IDataModelState = initialState,
  action?: Action,
): IDataModelState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_DATA_MODEL_FULFILLED: {
      const { dataModel } = action as IFetchDataModelFulfilled;
      return update<IDataModelState>(state, {
        $set: {
          dataModel,
          error: null,
          schemas: state.schemas,
        },
      });
    }
    case ActionTypes.FETCH_JSON_SCHEMA_FULFILLED: {
      const { schema, id } = action as IFetchJsonSchemaFulfilled;
      return update<IDataModelState>(state, {
        schemas: {
          $set: {
            [id]: schema,
          },
        },
      });
    }
    case ActionTypes.FETCH_DATA_MODEL_REJECTED:
    case ActionTypes.FETCH_JSON_SCHEMA_REJECTED: {
      const { error } = action as IFetchDataModelRejected;
      return update<IDataModelState>(state, {
        $set: {
          dataModel: state.dataModel,
          error,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default DataModelReducer;
