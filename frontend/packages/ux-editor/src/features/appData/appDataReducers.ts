import type { Reducer } from 'redux';
import { combineReducers } from 'redux';
import dataModelReducer from './dataModel/dataModelSlice';
import ruleModelReducer from './ruleModel/ruleModelSlice';
import textResourceReducer from './textResources/textResourcesSlice';

import type { IDataModelState } from './dataModel/dataModelSlice';
import type { IRuleModelState } from './ruleModel/ruleModelSlice';
import type { ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  dataModel: IDataModelState;
  textResources: ITextResourcesState;
  ruleModel: IRuleModelState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  dataModel: dataModelReducer,
  textResources: textResourceReducer,
  ruleModel: ruleModelReducer,
});

export default combinedReducers;
