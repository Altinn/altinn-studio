import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleServiceInformationReducer, { IHandleServiceInformationState } from '../features/administration/handleServiceInformationReducer';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import appClusterReducer, { IAppClusterState } from '../sharedResources/appCluster/appClusterSlice';
import appDeploymentReducer, { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer, { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer, { IAppReleaseState } from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer, { IConfigurationState } from '../sharedResources/configuration/configurationReducer';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';
import repoStatusReducer, { IRepoStatusState } from '../sharedResources/repoStatus/repoStatusReducer';
import dataModelingReducer, { IDataModelingState } from '../features/dataModeling/dataModelingSlice';

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
  Reducer<IDataModelingState>
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
  dataModeling: dataModelingReducer,
};

export default combineReducers(reducers);
