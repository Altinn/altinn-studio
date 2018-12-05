import { ILanguageState } from '../fetchLanguage/fetchLanguageReducer';
import { IDashboardStoreState } from '../Organization/fetchDashboardReducer';

declare global {
  export interface IDashboardNameSpace<T1, T2> {
    dashboard: T1;
    language: T2;
  }

  export interface IDashboardAppState
    extends IDashboardNameSpace
    <IDashboardStoreState,
    ILanguageState
    > { }
}
