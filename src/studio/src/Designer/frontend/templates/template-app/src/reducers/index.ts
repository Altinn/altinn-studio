import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import dashboardReducer, {IDashboardState} from '../reducers/dashboardReducer';

export interface IDashboardReducers
  extends IDashboardNameSpace<
  Reducer<IDashboardState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: dashboardReducer,
};

export default combineReducers(reducers);
