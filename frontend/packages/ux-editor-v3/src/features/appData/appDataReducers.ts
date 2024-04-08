import type { Reducer } from 'redux';
import { combineReducers } from 'redux';
import textResourceReducer from './textResources/textResourcesSlice';

import type { ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  textResources: ITextResourcesState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  textResources: textResourceReducer,
});

export default combinedReducers;
