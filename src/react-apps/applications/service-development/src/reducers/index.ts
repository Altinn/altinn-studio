import { combineReducers, Reducer, ReducersMapObject } from 'redux';
import serviceDevelopmentReducer, {IServiceDevelopmentState} from '../reducers/serviceDevelopmentReducer';

export interface IServiceDevelopmentReducers
  extends IServiceDevelopmentNameSpace<
  Reducer<IServiceDevelopmentState>
  >,
  ReducersMapObject { }

const reducers: IServiceDevelopmentReducers = {
  serviceDevelopment: serviceDevelopmentReducer,
};

export default combineReducers(reducers);
