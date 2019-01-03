import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import serviceDevelopmentReducer, { IServiceDevelopmentState } from '../reducers/serviceDevelopmentReducer';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
  Reducer<IFetchedLanguageState>,
  Reducer<IServiceDevelopmentState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  language: languageReducer,
  serviceDevelopment: serviceDevelopmentReducer,
};

export default combineReducers(reducers);
