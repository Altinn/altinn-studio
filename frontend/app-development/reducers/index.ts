import { dataModellingReducer } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer } from 'app-shared/features/dataModelling/sagas/metadata';
import handleServiceInformationReducer from '../features/administration/handleServiceInformationSlice';
import handleMergeConflictReducer from '../features/handleMergeConflict/handleMergeConflictSlice';
import appClusterReducer from '../sharedResources/appCluster/appClusterSlice';
import appDeploymentReducer from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer from '../sharedResources/configuration/configurationSlice';
import languageReducer from '../utils/fetchLanguage/languageSlice';
import repoStatusReducer from '../sharedResources/repoStatus/repoStatusSlice';
import userReducer from '../sharedResources/user/userSlice';
import { appDevelopmentApi } from '../services/appDevelopmentApi';

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
  [appDevelopmentApi.reducerPath]: appDevelopmentApi.reducer,
};
