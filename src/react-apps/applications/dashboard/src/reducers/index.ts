import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import languageReducer, { IFetchedLanguageState } from '../fetchLanguage/languageReducer';
import dashboardReducer, { IDashboardState } from '../services/dashboardReducer';

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
