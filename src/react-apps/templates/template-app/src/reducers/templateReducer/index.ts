// import update from 'immutability-helper';
import { Action, Reducer } from 'redux';

export interface ITemplateState { }

const initialState: ITemplateState = {};

const dashboardReducer: Reducer<ITemplateState> = (
  state: ITemplateState = initialState,
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
