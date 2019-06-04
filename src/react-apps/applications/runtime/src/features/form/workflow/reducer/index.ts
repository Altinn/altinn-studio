import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as ActionTypes from '../actions/types';
import {
  IGetCurrentStateFulfilled,
  IGetCurrentStateRejected,
  ISetCurrentState,
} from '../actions/workflowState';
import {
  WorkflowSteps,
} from '../typings';

export interface IWorkflowState {
  state: WorkflowSteps;
  error: Error;
}

const initialState: IWorkflowState = {
  state: null,
  error: null,
};

const WorkflowReducer: Reducer<IWorkflowState> = (
  state: IWorkflowState = initialState,
  action?: Action,
): IWorkflowState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.GET_CURRENT_STATE_FULFILLED: {
      const workflowState = (action as IGetCurrentStateFulfilled).state;
      return update<IWorkflowState>(state, {
        $set: {
          state: workflowState,
          error: null,
        },
      });
    }
    case ActionTypes.GET_CURRENT_STATE_REJECTED: {
      const { error } = action as IGetCurrentStateRejected;
      return update<IWorkflowState>(state, {
        $set: {
          state: state.state,
          error,
        },
      });
    }
    case ActionTypes.SET_CURRENT_STATE: {
      const workflowState = (action as ISetCurrentState).state;
      return update<IWorkflowState>(state, {
        $set: {
          state: workflowState,
          error: null,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default WorkflowReducer;
