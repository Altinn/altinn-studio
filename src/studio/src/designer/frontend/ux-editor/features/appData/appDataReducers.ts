import { combineReducers, Reducer } from 'redux';
import dataModelReducer, { IDataModelState } from './dataModel/dataModelSlice';
import languageReducer, { ILanguageState } from './language/languageSlice';
import ruleModelReducer, { IRuleModelState } from './ruleModel/ruleModelSlice';
import textResourceReducer, { ITextResourcesState } from './textResources/textResourcesSlice';

export interface IAppDataState {
  dataModel: IDataModelState;
  textResources: ITextResourcesState;
  ruleModel: IRuleModelState;
  language: ILanguageState;
}

const combinedReducers: Reducer<IAppDataState> = combineReducers({
  dataModel: dataModelReducer,
  textResources: textResourceReducer,
  ruleModel: ruleModelReducer,
  language: languageReducer,
});

export default combinedReducers;
