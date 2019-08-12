import {IReceiptState} from '../reducers';

declare global {
  export interface IDashboardNameSpace<T1> {
    dashboard: T1;
  }

  export interface IServiceDevelopmentAppState
    extends IDashboardNameSpace
    <IReceiptState> { }

  export interface IAltinnWindow extends Window {
    org: string;
    service: string;
    instanceId: string;
    reportee: string;
  }
}
