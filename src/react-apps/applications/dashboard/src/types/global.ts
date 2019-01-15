import { IDashboardState } from '../dashboardServices/dashboardReducer';
import { IFetchedLanguageState } from '../fetchLanguage/languageReducer';

declare global {
  export interface IDashboardNameSpace<T1, T2> {
    dashboard: T1;
    language: T2;
  }

  export interface IDashboardAppState
    extends IDashboardNameSpace
    <IDashboardState,
    IFetchedLanguageState
    > { }
}
