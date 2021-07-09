import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import { dataModellingReducer, IDataModellingState } from 'app-shared/features/dataModelling/sagas';
import { dataModelsMetadataReducer, IDataModelsMetadataState } from 'app-shared/features/dataModelling/sagas/metadata';
import dashboardReducer, { IDashboardState } from '../resources/fetchDashboardResources/dashboardSlice';
import languageReducer, { IFetchedLanguageState } from '../resources/fetchLanguage/languageSlice';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<IDashboardState>,
  Reducer<IFetchedLanguageState>,
  Reducer<IDataModellingState>,
  Reducer<IDataModelsMetadataState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: dashboardReducer,
  language: languageReducer,
  dataModelling: dataModellingReducer,
  dataModelsMetadataState: dataModelsMetadataReducer,
};

export default combineReducers(reducers);
