import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IInstantiateFulfilled, IInstantiateRejected } from '../actions/instantiate';
import * as InstantiateActionTypes from '../actions/types';

export interface IInstantiationState {
  instantiating: boolean;
  instanceId: string;
  error: Error;
}

const initialState: IInstantiationState = {
  instantiating: false,
  instanceId: null,
  error: null,
};

const InstantiationReducer: Reducer<IInstantiationState> = (
  state: IInstantiationState = initialState,
  action?: Action,
) => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case InstantiateActionTypes.INSTANTIATE_TOGGLE: {
      const { instantiating } = state;
      return update<IInstantiationState>(state, {
        instantiating: {
          $set: !instantiating,
        },
      });
    }
    case InstantiateActionTypes.INSTANTIATE_FULFILLED: {
      const { instanceId } = action as IInstantiateFulfilled;
      return update<IInstantiationState>(state, {
        instanceId: {
          $set: instanceId,
        },
      });
    }
    case InstantiateActionTypes.INSTANTIATE_REJECTED: {
      const { error } = action as IInstantiateRejected;
      return update<IInstantiationState>(state, {
        error: {
          $set: error,
        },
        instantiating: {
          $set: false,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default InstantiationReducer;
