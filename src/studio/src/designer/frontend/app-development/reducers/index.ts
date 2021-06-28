import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleServiceInformationReducer, { IHandleServiceInformationState } from '../features/administration/handleServiceInformationSlice';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictSlice';
import appClusterReducer, { IAppClusterState } from '../sharedResources/appCluster/appClusterSlice';
import appDeploymentReducer, { IAppDeploymentState } from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer, { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import datamodelsMetadataReducer, { IDatamodelsMetadataState } from '../sharedResources/datamodelsMetadata/datamodelsMetadataSlice';
import appReleaseReducer, { IAppReleaseState } from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer, { IConfigurationState } from '../sharedResources/configuration/configurationSlice';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageSlice';
import repoStatusReducer, { IRepoStatusState } from '../sharedResources/repoStatus/repoStatusSlice';
import { dataModellingReducer, IDataModellingState } from '../features/dataModelling/sagas';
import userReducer, { IUserState } from '../sharedResources/user/userSlice';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
  Reducer<IFetchedLanguageState>,
  Reducer<IHandleMergeConflictState>,
  Reducer<IHandleServiceInformationState>,
  Reducer<IApplicationMetadataState | IDatamodelsMetadataState>,
  Reducer<IAppClusterState>,
  Reducer<IRepoStatusState>,
  Reducer<IAppReleaseState>,
  Reducer<IAppDeploymentState>,
  Reducer<IConfigurationState>,
  Reducer<IDataModellingState>,
  Reducer<IUserState>
  >,
  ReducersMapObject { }

const reducers = (repoType?: string): IServiceDevelopmentReducers => {
  const repoMetadataState = repoType === 'datamodels' ? datamodelsMetadataReducer : applicationMetadataReducer;
  return {
    languageState: languageReducer,
    handleMergeConflict: handleMergeConflictReducer,
    serviceInformation: handleServiceInformationReducer,
    repoMetadataState,
    appCluster: appClusterReducer,
    repoStatus: repoStatusReducer,
    appReleases: appReleaseReducer,
    appDeployments: appDeploymentReducer,
    configuration: configurationReducer,
    dataModelling: dataModellingReducer,
    userState: userReducer,
  };
};

export default (repoType?: string) => combineReducers(reducers(repoType));
