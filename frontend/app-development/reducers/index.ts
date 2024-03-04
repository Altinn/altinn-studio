import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import appDeploymentReducer from '../sharedResources/appDeployment/appDeploymentSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  appDeployments: appDeploymentReducer,
  userState: userReducer,
};
