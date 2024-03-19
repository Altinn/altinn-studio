import handleServiceInformationReducer from '../features/overview/handleServiceInformationSlice';
import applicationMetadataReducer from '../sharedResources/applicationMetadata/applicationMetadataSlice';
import userReducer from '../sharedResources/user/userSlice';

export const rootReducer = {
  serviceInformation: handleServiceInformationReducer,
  applicationMetadataState: applicationMetadataReducer,
  userState: userReducer,
};
