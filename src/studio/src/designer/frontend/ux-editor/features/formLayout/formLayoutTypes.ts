import { Action } from 'redux';
import { ILayoutSettings } from 'app-shared/types';

export interface IFormLayoutActionRejected extends Action {
  error: Error;
}

export interface IAddActiveFormContainerAction extends Action {
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentAction extends Action {
  component: IFormComponent;
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentActionFulfilled extends Action {
  component: IFormComponent;
  position: number;
  containerId?: string;
  id: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentsAction extends Action {
  components: IFormComponent[];
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
}

export interface IAddFormComponentsActionFulfilled extends Action {
  components: IFormDesignerComponent;
  position: number;
  containerId?: string;
  ids: string[];
  callback?: (...args: any[]) => any;
}

export interface IAddFormContainerAction extends Action {
  container: ICreateFormContainer;
  positionAfterId?: string;
  addToId?: string;
  activeContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddFormContainerActionFulfilled extends Action {
  container: ICreateFormContainer;
  id: string;
  positionAfterId?: string;
  addToId?: string;
  baseContainerId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export interface IAddLayoutAction extends Action {
  layout: string;
}

export interface IAddLayoutFulfilledAction extends Action {
  layouts: IFormLayouts;
}

export interface IDeleteComponentsAction extends Action {
  components: string[];
}

export interface IDeleteComponentAction extends Action {
  id: string;
  containerId: string;
}

export interface IDeleteContainerAction extends Action {
  id: string;
  index?: number;
  parentContainerId?: string;
}

export interface IDeleteLayoutAction extends Action {
  layout: string;
}

export interface IFetchFormLayoutAction extends Action {
  url: string;
}

export interface IFetchFormLayoutFulfilledAction extends Action {
  formLayout: IFormLayouts;
}

export interface IFetchLayoutSettingsFulfilledAction extends Action {
  settings: ILayoutSettings;
}

export interface IUpdateActiveListAction extends Action {
  listItem: any;
  containerList: any;
}

export interface IUpdateActiveListActionFulfilled extends Action {
  containerList: any;
}

export interface IUpdateActiveListOrderAction extends Action {
  containerList: any;
  orderList: any[];
}

export interface IUpdateContainerIdAction extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateContainerIdFulfilled extends Action {
  currentId: string;
  newId: string;
}

export interface IUpdateFormComponentAction extends Action {
  updatedComponent: any;
  id: string;
  activeContainer?: string;
}

export interface IUpdateFormComponentActionFulfilled extends Action {
  updatedComponent: any;
  id: string;
}

export interface IUpdateFormComponentOrderAction extends Action {
  updatedOrder: any;
}

export interface IUpdateFormContainerAction extends Action {
  updatedContainer: any;
  id: string;
}

export interface IUpdateLayoutNameAction extends Action {
  oldName: string;
  newName: string;
}

export interface IUpdateLayoutOrderAction extends Action {
  layout: string;
  direction: 'up' | 'down';
}

export interface IUpdateSelectedLayoutAction extends Action {
  selectedLayout: string;
}
