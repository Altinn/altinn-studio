import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  userState: userReducer,
};
