import { IServiceDevelopmentState } from '../reducers/serviceDevelopmentReducer';
import { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1, T2> {
    language: T1;
    serviceDevelopment: T2;
  }

  export interface IServiceDevelopmentAppState
    extends IServiceDevelopmentNameSpace
    <IFetchedLanguageState,
    IServiceDevelopmentState> { }
}
