// import update from 'immutability-helper';
import { Action, Reducer } from 'redux';

export interface IServiceDevelopmentState {}

const initialState: IServiceDevelopmentState = {};

const serviceDevelopmentReducer: Reducer<IServiceDevelopmentState> = (
  state: IServiceDevelopmentState = initialState,
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

export default serviceDevelopmentReducer;
