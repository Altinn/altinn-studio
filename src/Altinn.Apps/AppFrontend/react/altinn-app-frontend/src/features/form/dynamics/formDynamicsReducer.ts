import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IFormDynamicState } from './index';
import { IFetchServiceConfigFulfilled, IFetchServiceConfigRejected } from './fetch/fetchFormDynamicsActions';
import * as actionTypes from './formDynamicsActionTypes';

const initialState: IFormDynamicState = {
  apis: null,
  ruleConnection: null,
  conditionalRendering: null,
  error: null,
};

const DynamicsReducer: Reducer<IFormDynamicState> = (
  state: IFormDynamicState = initialState,
  action?: Action,
): IFormDynamicState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case actionTypes.FETCH_SERVICE_CONFIG_FULFILLED: {
      const {
        apis,
        ruleConnection,
        conditionalRendering,
      } = action as IFetchServiceConfigFulfilled;
      return update<IFormDynamicState>(state, {
        apis: {
          $set: apis,
        },
        ruleConnection: {
          $set: ruleConnection,
        },
        conditionalRendering: {
          $set: conditionalRendering,
        },
        error: {
          $set: null,
        },
      });
    }
    case actionTypes.FETCH_SERVICE_CONFIG_REJECTED: {
      const { error } = action as IFetchServiceConfigRejected;
      return update<IFormDynamicState>(state, {
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

export default DynamicsReducer;
