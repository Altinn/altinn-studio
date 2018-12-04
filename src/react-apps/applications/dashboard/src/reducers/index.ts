import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import fetchLanguageReducer, { ILanguageState } from '../fetchLanguage/fetchLanguageReducer';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<ILanguageState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  language: fetchLanguageReducer,
};

export default combineReducers(reducers);
