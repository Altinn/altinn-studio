import { ILayoutSettings } from 'app-shared/types';

export interface IFormDesignerActionRejected {
  error: Error;
}

export interface IAddActiveFormContainerAction {
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddApplicationMetadataAction {
  id: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  fileType: string;
}

export interface IAddFormComponentAction {
  component: IFormComponent;
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentActionFulfilled {
  component: IFormComponent;
  position: number;
  containerId?: string;
  id: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentsAction {
  components: IFormComponent[];
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentsActionFulfilled {
  components: IFormDesignerComponents;
  position: number;
  containerId?: string;
  ids: string[];
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerAction {
  container: ICreateFormContainer;
  positionAfterId?: string;
  addToId?: string;
  activeContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddFormContainerActionFulfilled {
  container: ICreateFormContainer;
  id: string;
  positionAfterId?: string;
  addToId?: string;
  baseContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddLayoutAction {
  layout: string;
}

export interface IAddLayoutFulfilledAction {
  layouts: IFormLayouts;
  layoutOrder: string[];
}

export interface IAddWidgetAction {
  widget: IWidget;
  position: number;
  containerId?: string;
}

export interface IAddWidgetActionFulfilled {
  components: IFormDesignerComponents;
  position: number;
  containerId?: string;
  layoutId: string;
  containerOrder: string[];
}

export interface IDeleteApplicationMetadataAction {
  id: string;
}

export interface IDeleteComponentsAction {
  components: string[];
}

export interface IDeleteComponentAction {
  id: string;
  containerId: string;
}

export interface IDeleteContainerAction {
  id: string;
  index?: number;
  parentContainerId?: string;
}

export interface IDeleteLayoutAction {
  layout: string;
}

export interface IFetchFormLayoutFulfilledAction {
  formLayout: IFormLayouts;
}

export interface IFetchLayoutSettingsFulfilledAction {
  settings: ILayoutSettings;
}

export interface IUpdateActiveListAction {
  listItem: any;
  containerList: any;
}

export interface IUpdateActiveListActionFulfilled {
  containerList: any;
}

export interface IUpdateActiveListOrderAction {
  containerList: any;
  orderList: any[];
}

export interface IUpdateApplicationMetadaAction {
  id: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  fileType: string;
}

export interface IUpdateContainerIdFulfilled {
  currentId: string;
  newId: string;
}

export interface IUpdateFormComponentAction {
  updatedComponent: IFormComponent;
  id: string;
  activeContainer?: string;
}

export interface IUpdateFormComponentActionFulfilled {
  updatedComponent: IFormComponent;
  id: string;
}

export interface IUpdateFormComponentIdAction {
  currentId: string;
  newId: string;
}

export interface IUpdateFormComponentOrderAction {
  updatedOrder: any;
}

export interface IUpdateFormContainerAction {
  updatedContainer: any;
  id: string;
}

export interface IUpdateLayoutNameAction {
  oldName: string;
  newName: string;
}

export interface IUpdateLayoutOrderAction {
  layout: string;
  direction: 'up' | 'down';
}

export interface IUpdateSelectedLayoutAction {
  selectedLayout: string;
}
