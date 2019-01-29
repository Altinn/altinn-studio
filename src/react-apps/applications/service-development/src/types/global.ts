import { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1, T2> {
    language: T1;
    handleMergeConflict: T2;
  }

  export interface IServiceDevelopmentState
    extends IServiceDevelopmentNameSpace
    <IFetchedLanguageState,
    IHandleMergeConflictState> { }
}
