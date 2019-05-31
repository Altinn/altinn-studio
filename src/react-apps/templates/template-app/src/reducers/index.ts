import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import dashboardReducer, { ITemplateState } from './templateReducer';

export interface IDashboardReducers
  extends ITemplateNameSpace<
  Reducer<ITemplateState>
  >,
  ReducersMapObject { }

const reducers: IDashboardReducers = {
  dashboard: dashboardReducer,
};

export default combineReducers(reducers);
