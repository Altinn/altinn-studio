import type { Reducer } from 'redux';
import { combineReducers } from 'redux';
import ruleModelReducer from './ruleModel/ruleModelSlice';
import textResourceReducer from './textResources/textResourcesSlice';

import type { IRuleModelState } from './ruleModel/ruleModelSlice';
import type { ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  textResources: ITextResourcesState;
  ruleModel: IRuleModelState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  textResources: textResourceReducer,
  ruleModel: ruleModelReducer,
});

export default combinedReducers;
