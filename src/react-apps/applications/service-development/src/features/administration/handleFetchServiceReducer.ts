import update from 'immutability-helper';
import { Action, Reducer } from 'redux';
import * as handleFetchServiceActions from './handleFetchServiceActions';
import * as handleFetchServiceActionTypes from './handleFetchServiceActionTypes';

export interface IHandleFetchServiceState {
  service: any;
}

const initialState: IHandleFetchServiceState = {
  service: null,
};

const handleFetchServiceReducer: Reducer<IHandleFetchServiceState> = (
  state: IHandleFetchServiceState = initialState,
  action?: Action,
): IHandleFetchServiceState => {
  if (!action) {
    return state;
  }
  switch (action.type) {
    case handleFetchServiceActionTypes.FETCH_SERVICE_FULFILLED: {
      const { result } = action as handleFetchServiceActions.IFetchServiceFulfilled;
      return update<IHandleFetchServiceState>(state, {
        $set: result,
      });
    }
    default: { return state; }
  }
};

export default handleFetchServiceReducer;
