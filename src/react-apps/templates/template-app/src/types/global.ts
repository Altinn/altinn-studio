import { ITemplateState } from '../reducers/templateReducer';

declare global {
  export interface ITemplateNameSpace<T1> {
    dashboard: T1;
  }

  export interface ITemplateAppStore
    extends ITemplateNameSpace
    <ITemplateState> { }
}
