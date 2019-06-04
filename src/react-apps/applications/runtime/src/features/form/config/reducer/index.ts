import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import {
  IFetchFormConfigFulfilled,
  IFetchFormConfigRejected,
} from '../actions/fetch';
import * as ActionTypes from '../actions/types';

export interface IFormConfigState {
  org: string;
  serviceId: string;
  serviceName: string;
  repositoryName: string;
  error: Error;
}

const initalState: IFormConfigState = {
  org: null,
  serviceId: null,
  serviceName: null,
  repositoryName: null,
  error: null,
};

const FormConfigReducer: Reducer<IFormConfigState> = (
  state: IFormConfigState = initalState,
  action?: Action,
): IFormConfigState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_FORM_CONFIG_FULFILLED: {
      const { org, serviceId, serviceName, repositoryName } = action as IFetchFormConfigFulfilled;
      return update<IFormConfigState>(state, {
        org: {
          $set: org,
        },
        serviceId: {
          $set: serviceId,
        },
        serviceName: {
          $set: serviceName,
        },
        repositoryName: {
          $set: repositoryName,
        },
      });
    }
    case ActionTypes.FETCH_FORM_CONFIG_REJECTED: {
      const { error } = action as IFetchFormConfigRejected;
      return update<IFormConfigState>(state, {
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

export default FormConfigReducer;
