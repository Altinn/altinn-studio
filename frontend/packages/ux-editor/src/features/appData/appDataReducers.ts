import { combineReducers, type Reducer } from 'redux';
import textResourceReducer, { type ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  textResources: ITextResourcesState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  textResources: textResourceReducer,
});

export default combinedReducers;
