import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
  Reducer<IFetchedLanguageState>,
  Reducer<IHandleMergeConflictState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  language: languageReducer,
  handleMergeConflict: handleMergeConflictReducer,
};

export default combineReducers(reducers);
