import type { Reducer } from 'redux';
import { combineReducers } from 'redux';
import formLayoutReducer from './formLayout/formLayoutSlice';
import type { IFormLayoutState } from './formLayout/formLayoutSlice';

export interface IFormDesignerState {
  layout: IFormLayoutState;
}

const combinedReducers: Reducer<IFormDesignerState> = combineReducers({
  layout: formLayoutReducer,
});

export default combinedReducers;
