import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as GetProcessStateActions from './getProcessState/getProcessStateActions';
import * as ProcessActionTypes from './processActionTypes';

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
      console.log('#### ProcessState: ', processState.currentTask.name);
      console.log('#### Workflowsteps: ', ProcessSteps);
      return update<IProcessState>(state, {
        $set: {
          // state: processState,
          // state: 1,
          state: ProcessSteps[processState.currentTask.name],
          error: null,
        },
      });
    }

    default: { return state; }
  }
};

export default processReducer;
