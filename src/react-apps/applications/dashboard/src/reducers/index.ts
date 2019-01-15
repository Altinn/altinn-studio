import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import dashboardReducer, { IDashboardState } from '../dashboardServices/dashboardReducer';
import languageReducer, { IFetchedLanguageState } from '../fetchLanguage/languageReducer';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<IDashboardState>,
  Reducer<IFetchedLanguageState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: dashboardReducer,
  language: languageReducer,
};

export default combineReducers(reducers);
