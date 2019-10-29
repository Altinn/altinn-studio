import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleServiceInformationReducer, { IHandleServiceInformationState } from '../features/administration/handleServiceInformationReducer';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import appClusterReducer, { IAppClusterState } from '../sharedResources/appCluster/appClusterReducer';
import appDeploymentReducer, { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentReducer';
import applicationMetadataReducer, { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataReducer';
import appReleaseReducer, { IAppReleaseState } from '../sharedResources/appRelease/appReleaseReducer';
import configurationReducer, { IConfigurationState } from '../sharedResources/configuration/configurationReducer';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';
import repoStatusReducer, { IRepoStatusState } from './../sharedResources/repoStatus/repoStatusReducer';

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
  Reducer<IConfigurationState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  language: languageReducer,
  handleMergeConflict: handleMergeConflictReducer,
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  appCluster: appClusterReducer,
  repoStatus: repoStatusReducer,
  appReleases: appReleaseReducer,
  appDeployments: appDeploymentReducer,
  configuration: configurationReducer,
};

export default combineReducers(reducers);
