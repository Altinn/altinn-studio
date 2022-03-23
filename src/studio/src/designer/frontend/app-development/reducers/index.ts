import { Reducer, ReducersMapObject } from 'redux';
import { dataModellingReducer } from 'app-shared/features/dataModelling/sagas';
import type { IDataModellingState } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer } from 'app-shared/features/dataModelling/sagas/metadata';
import type { IDataModelsMetadataState } from 'app-shared/features/dataModelling/sagas/metadata';
import handleServiceInformationReducer from '../features/administration/handleServiceInformationSlice';
import type { IHandleServiceInformationState } from '../features/administration/handleServiceInformationSlice';
import handleMergeConflictReducer from '../features/handleMergeConflict/handleMergeConflictSlice';
import type { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictSlice';
import appClusterReducer from '../sharedResources/appCluster/appClusterSlice';
import type { IAppClusterState } from '../sharedResources/appCluster/appClusterSlice';
import appDeploymentReducer from '../sharedResources/appDeployment/appDeploymentSlice';
import type { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import type { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer from '../sharedResources/appRelease/appReleaseSlice';
import type { IAppReleaseState } from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer from '../sharedResources/configuration/configurationSlice';
import type { IConfigurationState } from '../sharedResources/configuration/configurationSlice';
import languageReducer from '../utils/fetchLanguage/languageSlice';
import type { IFetchedLanguageState } from '../utils/fetchLanguage/languageSlice';
import repoStatusReducer from '../sharedResources/repoStatus/repoStatusSlice';
import type { IRepoStatusState } from '../sharedResources/repoStatus/repoStatusSlice';
import userReducer from '../sharedResources/user/userSlice';
import type { IUserState } from '../sharedResources/user/userSlice';
import type { IServiceDevelopmentNameSpace } from '../types/global';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
      Reducer<IFetchedLanguageState>,
      Reducer<IHandleMergeConflictState>,
      Reducer<IHandleServiceInformationState>,
      Reducer<IApplicationMetadataState>,
      Reducer<IAppClusterState>,
      Reducer<IRepoStatusState>,
      Reducer<IAppReleaseState>,
      Reducer<IAppDeploymentState>,
      Reducer<IConfigurationState>,
      Reducer<IDataModellingState>,
      Reducer<IDataModelsMetadataState>,
      Reducer<IUserState>
    >,
    ReducersMapObject {}

export const rootReducer = {
  languageState: languageReducer,
  handleMergeConflict: handleMergeConflictReducer,
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  appCluster: appClusterReducer,
  repoStatus: repoStatusReducer,
  appReleases: appReleaseReducer,
  appDeployments: appDeploymentReducer,
  configuration: configurationReducer,
  dataModelling: dataModellingReducer,
  dataModelsMetadataState: dataModelsMetadataReducer,
  userState: userReducer,
};
