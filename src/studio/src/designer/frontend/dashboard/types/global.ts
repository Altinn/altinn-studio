import { IDataModellingState } from 'app-shared/features/dataModelling/sagas';
import { IDataModelsMetadataState } from 'app-shared/features/dataModelling/sagas/metadata';
import { IDashboardState } from '../resources/fetchDashboardResources/dashboardSlice';
import { IFetchedLanguageState } from '../resources/fetchLanguage/languageSlice';

declare global {
  export interface IDashboardNameSpace<T1, T2, T3, T4> {
    dashboard: T1;
    language: T2;
    dataModelling: T3;
    dataModelsMetadataState: T4;
  }

  export interface IDashboardAppState
    extends IDashboardNameSpace
    <IDashboardState,
    IFetchedLanguageState,
    IDataModellingState,
    IDataModelsMetadataState
    > { }

  export interface IAltinnWindow extends Window {
    org: string;
    app: string;
    repo?: string;
    instanceId: string;
    reportee: string;
  }
}
