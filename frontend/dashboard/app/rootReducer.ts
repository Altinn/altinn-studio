import { dataModellingReducer } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer } from 'app-shared/features/dataModelling/sagas/metadata';
import dashboardReducer from '../resources/fetchDashboardResources/dashboardSlice';
import { designerApi } from '../services/designerApi';

export const rootReducer = {
  dashboard: dashboardReducer,
  dataModelling: dataModellingReducer,
  dataModelsMetadataState: dataModelsMetadataReducer,
  [designerApi.reducerPath]: designerApi.reducer,
};
