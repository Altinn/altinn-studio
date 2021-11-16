import { dataModellingReducer } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer } from 'app-shared/features/dataModelling/sagas/metadata';
import dashboardReducer from '../resources/fetchDashboardResources/dashboardSlice';
import languageReducer from '../resources/fetchLanguage/languageSlice';

export const rootReducer = {
  dashboard: dashboardReducer,
  language: languageReducer,
  dataModelling: dataModellingReducer,
  dataModelsMetadataState: dataModelsMetadataReducer,
};
