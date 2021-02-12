import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleServiceInformationReducer, { IHandleServiceInformationState } from '../features/administration/handleServiceInformationSlice';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictSlice';
import appClusterReducer, { IAppClusterState } from '../sharedResources/appCluster/appClusterSlice';
import appDeploymentReducer, { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer, { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer, { IAppReleaseState } from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer, { IConfigurationState } from '../sharedResources/configuration/configurationSlice';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageSlice';
import repoStatusReducer, { IRepoStatusState } from '../sharedResources/repoStatus/repoStatusSlice';
import dataModelingReducer, { IDataModelingState } from '../features/dataModeling/dataModelingSlice';
import userReducer, { IUserState } from '../sharedResources/user/userSlice';

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
  Reducer<IDataModelingState>,
  Reducer<IUserState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  languageState: languageReducer,
  handleMergeConflict: handleMergeConflictReducer,
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  appCluster: appClusterReducer,
  repoStatus: repoStatusReducer,
  appReleases: appReleaseReducer,
  appDeployments: appDeploymentReducer,
  configuration: configurationReducer,
  dataModeling: dataModelingReducer,
  userState: userReducer,
};

export default combineReducers(reducers);
