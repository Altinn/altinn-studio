// import update from 'immutability-helper';
import { Action, Reducer } from 'redux';

export interface IReceiptState {
  instance: any;
}

const initialState: IReceiptState = {
  instance: null,
};

const dashboardReducer: Reducer<IReceiptState> = (
  state: IReceiptState = initialState,
  action?: Action,
): any => {
  if (!action) {
    return state;
  }

  switch (action.type) {
    default:
      return state;
  }
};

export default dashboardReducer;
