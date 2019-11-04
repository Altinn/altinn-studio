import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as GetProcessStateActions from './getProcessState/getProcessStateActions';
import * as ProcessActionTypes from './processActionTypes';
import * as StartProcessActions from './startProcess/startProcessActions';

import {
  ProcessSteps,
} from './typings';

export interface IProcessState {
  state: ProcessSteps;
  error: Error;
}

const initialState: IProcessState = {
  state: null,
  error: null,
};

const processReducer: Reducer<IProcessState> = (
  state: IProcessState = initialState,
  action?: Action,
): IProcessState => {
  if (!action) {
    return state;
  }
  switch (action.type) {

    case ProcessActionTypes.GET_PROCESS_STATE_FULFILLED: {
      const processState = (action as GetProcessStateActions.IGetProcessStateFulfilled).result;
      return update<IProcessState>(state, {
        $set: {
          // state: processState,
          // state: 1,
          state: ProcessSteps[processState.currentTask.name],
          error: null,
        },
      });
    }

    case ProcessActionTypes.GET_PROCESS_STATE_REJECTED: {
      const error = (action as GetProcessStateActions.IGetProcessStateRejected).error;
      return update<IProcessState>(state, {
        $set: {
          error,
        },
      });
    }

    case ProcessActionTypes.START_PROCESS_FULFILLED: {
      const result = (action as StartProcessActions.IStartProcessFulfilled).result;
      return update<IProcessState>(state, {
        $set: {
          state: ProcessSteps[result.currentTask.name],
          error: null,
        },
      });
    }

    case ProcessActionTypes.START_PROCESS_REJECTED: {
      const error = (action as StartProcessActions.IStartProcessRejected).error;
      return update<IProcessState>(state, {
        $set: {
          error,
        },
      });
    }

    default: { return state; }
  }
};

export default processReducer;
