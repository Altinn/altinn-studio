import type { IDataModellingState } from 'app-shared/features/dataModelling/sagas';
import type { IDataModelsMetadataState } from 'app-shared/features/dataModelling/sagas/metadata';
import type { IDashboardState } from '../resources/fetchDashboardResources/dashboardSlice';
import type { IFetchedLanguageState } from '../resources/fetchLanguage/languageSlice';

export interface IDashboardNameSpace<T1, T2, T3, T4> {
  dashboard: T1;
  language: T2;
  dataModelling: T3;
  dataModelsMetadataState: T4;
}

export type IDashboardAppState = IDashboardNameSpace<
  IDashboardState,
  IFetchedLanguageState,
  IDataModellingState,
  IDataModelsMetadataState
>;

export interface IAltinnWindow extends Window {
  org: string;
  app: string;
  repo?: string;
  instanceId: string;
  reportee: string;
}
