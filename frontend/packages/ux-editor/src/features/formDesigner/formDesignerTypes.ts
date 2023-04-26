import type { IFormComponent, IWidget } from '../../types/global';

export interface IAddLayoutFulfilledAction {
  layoutOrder: string[];
  receiptLayoutName?: string;
}

export interface IFormDesignerActionRejected {
  error: Error;
}

export interface ApplicationAttachmentMetadata {
  id: string;
  maxCount: number;
  minCount: number;
  maxSize: number;
  fileType: string;
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
  components: IFormComponent[];
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

export interface IUpdateFormComponentIdAction {
  currentId: string;
  newId: string;
  org: string;
  app: string;
}

export interface IUpdateLayoutNameAction {
  oldName: string;
  newName: string;
}

export interface IUpdateContainerIdAction {
  currentId: string;
  newId: string;
}
