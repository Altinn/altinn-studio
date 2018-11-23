import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import { IAddErrorAction, IRemoveErrorAction } from '../../actions/errorActions/actions';
import * as ErrorActionTypes from '../../actions/errorActions/errorActionTypes';
import { IErrorState } from './index';

export interface IErrorStateError {
  errorMessage: string;
}

const initialState: IErrorState = {
  errorList: [],
};

const errorReducer: Reducer<IErrorState> = (
  state: IErrorState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case ErrorActionTypes.ADD_ERROR: {
      return update<IErrorState>(state, {
        errorList: {
          $push: [{
            errorMessage: (action as IAddErrorAction).errorMessage,
          }],
        },
      });
    }
    case ErrorActionTypes.REMOVE_ERROR: {
      return update<IErrorState>(state, {
        errorList: {
          $splice: [[(action as IRemoveErrorAction).errorIndex, 1]],
        },
      });
    }
    default: {
      return state;
    }
  }
};

export default errorReducer;
