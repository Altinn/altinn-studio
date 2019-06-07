import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import {
  IFetchFormUserFulfilled,
  IFetchFormUserRejected,
} from '../actions/fetch';
import * as ActionTypes from '../actions/types';

export interface IFormUserState {
  firstName: string;
  middleName: string;
  lastName: string;
  organization: string;
  error: Error;
}

const initalState: IFormUserState = {
  firstName: null,
  middleName: null,
  lastName: null,
  organization: null,
  error: null,
};

const FormUserReducer: Reducer<IFormUserState> = (
  state: IFormUserState = initalState,
  action?: Action,
): IFormUserState => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    case ActionTypes.FETCH_FORM_USER_FULFILLED: {
      const { firstName, middleName, lastName, organization } = action as IFetchFormUserFulfilled;
      return update<IFormUserState>(state, {
        firstName: {
          $set: firstName,
        },
        middleName: {
          $set: middleName,
        },
        lastName: {
          $set: lastName,
        },
        organization: {
          $set: organization,
        },
      });
    }
    case ActionTypes.FETCH_FORM_USER_REJECTED: {
      const { error } = action as IFetchFormUserRejected;
      return update<IFormUserState>(state, {
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

export default FormUserReducer;
