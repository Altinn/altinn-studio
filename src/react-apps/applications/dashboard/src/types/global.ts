import { ILanguageState } from '../fetchLanguage/fetchLanguageReducer';

declare global {
  export interface IDashboardNameSpace<T1> {
    language: T1;
  }

  export interface IDashboardAppState
    extends IDashboardNameSpace
    <ILanguageState
    > { }
}
