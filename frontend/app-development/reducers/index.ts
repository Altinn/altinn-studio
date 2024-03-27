import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import appDeploymentReducer from '../sharedResources/appDeployment/appDeploymentSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  appDeployments: appDeploymentReducer,
  userState: userReducer,
};
