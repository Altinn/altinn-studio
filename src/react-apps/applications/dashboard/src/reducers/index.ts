import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import fetchLanguageReducer, { ILanguageState } from '../fetchLanguage/fetchLanguageReducer';
import fetchDashboardReducer, { IDashboardStoreState } from '../services/fetchDashboardReducer';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<IDashboardStoreState>,
  Reducer<ILanguageState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: fetchDashboardReducer,
  language: fetchLanguageReducer,
};

export default combineReducers(reducers);
