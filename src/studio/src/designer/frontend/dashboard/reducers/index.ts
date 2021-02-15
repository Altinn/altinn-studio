import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import dashboardReducer, { IDashboardState } from '../resources/fetchDashboardResources/dashboardSlice';
import languageReducer, { IFetchedLanguageState } from '../resources/fetchLanguage/languageSlice';

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
