import {IServiceDevelopmentState} from '../reducers/serviceDevelopmentReducer';

declare global {
  export interface IServiceDevelopmentNameSpace<T1> {
    serviceDevelopment: T1;
  }

  export interface IServiceDevelopmentAppState
    extends IServiceDevelopmentNameSpace
    <IServiceDevelopmentState> { }
}
