import { IDashboardState } from '../resources/fetchDashboardResources/dashboardSlice';
import { IFetchedLanguageState } from '../resources/fetchLanguage/languageSlice';

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

  export interface IAltinnWindow extends Window {
    org: string;
    app: string;
    instanceId: string;
    reportee: string;
  }
}
