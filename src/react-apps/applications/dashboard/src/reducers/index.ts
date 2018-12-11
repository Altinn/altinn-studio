import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import fetchLanguageReducer, { IFetchedLanguageState } from '../fetchLanguage/languageReducer';
import fetchDashboardReducer, { IDashboardState } from '../services/dashboardReducer';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<IDashboardState>,
  Reducer<IFetchedLanguageState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: fetchDashboardReducer,
  language: fetchLanguageReducer,
};

export default combineReducers(reducers);
