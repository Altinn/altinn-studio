import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import dashboardReducer, { IDashboardState } from '../resources/fetchDashboardResources/dashboardReducer';
import languageReducer, { IFetchedLanguageState } from '../resources/fetchLanguage/languageReducer';

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
