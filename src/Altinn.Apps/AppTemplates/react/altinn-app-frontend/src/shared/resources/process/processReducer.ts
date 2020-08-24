import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { ProcessSteps} from '../../../types';
import * as CompleteProcessActions from './completeProcess/completeProcessActions';
import * as GetProcessStateActions from './getProcessState/getProcessStateActions';
import * as ProcessActionTypes from './processActionTypes';

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
      const processStep = (action as GetProcessStateActions.IGetProcessStateFulfilled).processStep;
      return update<IProcessState>(state, {
        $set: {
          state: processStep,
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

    case ProcessActionTypes.COMPLETE_PROCESS_FULFILLED: {
      const processStep = (action as CompleteProcessActions.ICompleteProcessFulfilled).processStep;
      return update<IProcessState>(state, {
        $set: {
          state: processStep,
          error: null,
        },
      });
    }

    case ProcessActionTypes.COMPLETE_PROCESS_REJECTED: {
      const error = (action as CompleteProcessActions.ICompleteProcessRejected).error;
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
