import { combineReducers, Reducer } from 'redux';
import formLayoutReducer, { IFormLayoutState } from './formLayout/formLayoutSlice';

export interface IFormDesignerState {
  layout: IFormLayoutState;
}

const combinedReducers: Reducer<IFormDesignerState> = combineReducers({
  layout: formLayoutReducer,
});

export default combinedReducers;
