import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import appDeploymentReducer from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import appReleaseReducer from '../sharedResources/appRelease/appReleaseSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  appReleases: appReleaseReducer,
  appDeployments: appDeploymentReducer,
  userState: userReducer,
};
