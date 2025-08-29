import type { IWidget } from '../../types/global';
import type { FormComponent } from '../../types/FormComponent';

export interface IAddLayoutFulfilledAction {
  layoutOrder: string[];
  receiptLayoutName?: string;
}

export interface IFormDesignerActionRejected {
  error: Error;
}

export interface IAddApplicationMetadataAction {
  id: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  fileType: string;
  org: string;
  app: string;
}

export interface IAddFormComponentsAction {
  components: FormComponent[];
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddWidgetAction {
  widget: IWidget;
  position: number;
  containerId?: string;
}

export interface IDeleteContainerAction {
  id: string;
  index?: number;
  parentContainerId?: string;
  org: string;
  app: string;
}

export interface IDeleteLayoutAction {
  layout: string;
  pageOrder: string[];
}

export interface IUpdateLayoutNameAction {
  oldName: string;
  newName: string;
}
