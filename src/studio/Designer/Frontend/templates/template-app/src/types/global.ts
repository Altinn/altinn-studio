import {IDashboardState} from '../reducers/dashboardReducer';

declare global {
  export interface IDashboardNameSpace<T1> {
    dashboard: T1;
  }

  export interface IServiceDevelopmentAppState
    extends IDashboardNameSpace
    <IDashboardState> { }
}
