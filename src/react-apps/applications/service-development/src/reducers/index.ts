import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import handleServiceInformationReducer, { IHandleServiceInformationState } from '../features/administration/handleServiceInformationReducer';
import deployReducer, { IDeployState } from '../features/deploy/deployReducer';
import handleMergeConflictReducer, { IHandleMergeConflictState } from '../features/handleMergeConflict/handleMergeConflictReducer';
import appClusterReducer, { IAppClusterState } from '../sharedResources/appCluster/appClusterReducer';
import applicationMetadataReducer, { IApplicationMetadataState } from '../sharedResources/applicationMetadata/applicationMetadataReducer';
import releaseReducer, { IAppReleaseState } from '../sharedResources/appRelease/appReleaseReducer';
import languageReducer, { IFetchedLanguageState } from '../utils/fetchLanguage/languageReducer';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
  Reducer<IFetchedLanguageState>,
  Reducer<IHandleMergeConflictState>,
  Reducer<IHandleServiceInformationState>,
  Reducer<IDeployState>,
  Reducer<IApplicationMetadataState>,
  Reducer<IAppClusterState>,
  Reducer<IAppReleaseState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  language: languageReducer,
  handleMergeConflict: handleMergeConflictReducer,
  serviceInformation: handleServiceInformationReducer,
  deploy: deployReducer,
  applicationMetadataState: applicationMetadataReducer,
  appCluster: appClusterReducer,
  appReleases: releaseReducer,
};

export default combineReducers(reducers);
