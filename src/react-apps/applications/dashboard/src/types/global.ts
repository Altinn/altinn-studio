import { IFetchedLanguageState } from '../fetchLanguage/languageReducer';
import { IDashboardState } from '../services/dashboardReducer';

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
    service: string;
    instanceId: string;
    reportee: string;
  }
}
