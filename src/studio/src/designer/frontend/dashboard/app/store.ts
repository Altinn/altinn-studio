import { configureStore } from '@reduxjs/toolkit';

import { dataModellingReducer } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer } from 'app-shared/features/dataModelling/sagas/metadata';
import dashboardReducer from '../resources/fetchDashboardResources/dashboardSlice';
import languageReducer from '../resources/fetchLanguage/languageSlice';

import { sagaMiddleware } from './rootSaga';

const middlewares = [sagaMiddleware];

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    language: languageReducer,
    dataModelling: dataModellingReducer,
    dataModelsMetadataState: dataModelsMetadataReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware: () => any[]) =>
    getDefaultMiddleware().concat(middlewares),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
