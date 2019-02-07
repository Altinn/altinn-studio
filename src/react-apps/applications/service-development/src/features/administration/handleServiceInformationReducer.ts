import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { ICommit, IServiceName } from '../../types/global';
import * as handleServiceInformationActions from './handleServiceInformationActions';
import * as handleServiceInformationActionTypes from './handleServiceInformationActionTypes';

export interface IHandleServiceInformationState {
  repositoryInfo: any;
  serviceNameObj: IServiceName;
  initialCommit: ICommit;
}

const initialState: IHandleServiceInformationState = {
  repositoryInfo: null,
  serviceNameObj: {
    name: '',
    saving: false,
  },
  initialCommit: null,
};

const handleServiceInformationReducer: Reducer<IHandleServiceInformationState> = (
  state: IHandleServiceInformationState = initialState,
  action?: Action,
): IHandleServiceInformationState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case handleServiceInformationActionTypes.FETCH_SERVICE_FULFILLED: {
      const { result } = action as handleServiceInformationActions.IFetchServiceFulfilled;
      return update<IHandleServiceInformationState>(state, {
        repositoryInfo: {
          $set: result,
        },
      });
    }
    case handleServiceInformationActionTypes.FETCH_SERVICE_NAME_FULFILLED: {
      const { serviceName } = action as handleServiceInformationActions.IFetchServiceNameFulfilled;
      return update<IHandleServiceInformationState>(state, {
        serviceNameObj: {
          name: {
            $set: serviceName,
          },
          saving: {
            $set: false,
          },
        },
      });
    }
    case handleServiceInformationActionTypes.SAVE_SERVICE_NAME: {
      return update<IHandleServiceInformationState>(state, {
        serviceNameObj: {
          saving: {
            $set: true,
          },
        },
      });
    }
    case handleServiceInformationActionTypes.SAVE_SERVICE_NAME_REJECTED: {
      return update<IHandleServiceInformationState>(state, {
        serviceNameObj: {
          saving: {
            $set: false,
          },
        },
      });
    }
    case handleServiceInformationActionTypes.SAVE_SERVICE_NAME_FULFILLED: {
      const { newServiceName } = action as handleServiceInformationActions.ISaveServiceNameFulfilled;
      return update<IHandleServiceInformationState>(state, {
        serviceNameObj: {
          name: {
            $set: newServiceName,
          },
          saving: {
            $set: false,
          },
        },
      });
    }
    case handleServiceInformationActionTypes.FETCH_INITIAL_COMMIT_FULFILLED: {
      const { result } = action as handleServiceInformationActions.IFetchInitialCommitFulfilled;
      return update<IHandleServiceInformationState>(state, {
        initialCommit: {
          $set: result,
        },
      });
    }
    default: { return state; }
  }
};

export default handleServiceInformationReducer;
