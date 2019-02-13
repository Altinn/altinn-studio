import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IWorkflowState } from '.';
import { IGetCurrentStateFulfilled, ISetCurrentState } from '../../actions/workflowActions/actions';
import * as WorkflowActionTypes from '../../actions/workflowActions/workflowActionTypes';

const initialState: IWorkflowState = {
  workflowStep: null,
};

const workflowReducer: Reducer<IWorkflowState> = (
  state: IWorkflowState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case WorkflowActionTypes.GET_CURRENT_STATE_FULFILLED: {
      if ((action as IGetCurrentStateFulfilled).state === 3) {
        document.body.className = 'a-bgGreenLight flex-column d-flex';
      }
      return update<IWorkflowState>(state, {
        workflowStep: {
          $set: (action as IGetCurrentStateFulfilled).state,
        },
      });
    }
    case WorkflowActionTypes.SET_CURRENT_STATE: {
      if ((action as ISetCurrentState).state === 3) {
        document.body.className = 'a-bgGreenLight flex-column d-flex';
      }
      return update<IWorkflowState>(state, {
        workflowStep: {
          $set: (action as ISetCurrentState).state,
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default workflowReducer;
