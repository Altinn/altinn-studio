import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer from '../sharedResources/appRelease/appReleaseSlice';
import configurationReducer from '../sharedResources/configuration/configurationSlice';
import repoStatusReducer from '../sharedResources/repoStatus/repoStatusSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  repoStatus: repoStatusReducer,
  appReleases: appReleaseReducer,
  configuration: configurationReducer,
  userState: userReducer,
};
