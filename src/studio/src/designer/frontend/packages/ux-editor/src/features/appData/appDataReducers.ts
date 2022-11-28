import type { Reducer } from 'redux';
import { combineReducers } from 'redux';
import dataModelReducer from './dataModel/dataModelSlice';
import languageReducer from './language/languageSlice';
import ruleModelReducer from './ruleModel/ruleModelSlice';
import textResourceReducer from './textResources/textResourcesSlice';

import type { IDataModelState } from './dataModel/dataModelSlice';
import type { ILanguageState } from './language/languageSlice';
import type { IRuleModelState } from './ruleModel/ruleModelSlice';
import type { ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  dataModel: IDataModelState;
  textResources: ITextResourcesState;
  ruleModel: IRuleModelState;
  languageState: ILanguageState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  dataModel: dataModelReducer,
  textResources: textResourceReducer,
  ruleModel: ruleModelReducer,
  languageState: languageReducer,
});

export default combinedReducers;
