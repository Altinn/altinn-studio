import { IHandleFetchServiceState } from '../features/administration/handleFetchServiceReducer';
import { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1, T2, T3> {
    language: T1;
    handleMergeConflict: T2;
    service: T3;
  }

  export interface IServiceDevelopmentState
    extends IServiceDevelopmentNameSpace
    <IFetchedLanguageState,
    IHandleMergeConflictState,
    IHandleFetchServiceState> { }
}
