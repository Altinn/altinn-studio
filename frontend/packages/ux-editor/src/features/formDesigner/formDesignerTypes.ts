import type { ILayoutSettings } from 'app-shared/types/global';
import type {
  IFormComponent,
  IFormDesignerComponents,
  ICreateFormContainer,
  IWidget,
  IFormLayouts,
} from '../../types/global';

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
  org :string;
  app: string;
}

export interface IAddFormComponentAction {
  component: IFormComponent;
  position: number;
  containerId?: string;
  callback?: (...args: any[]) => any;
  org: string;
  app: string;
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
  org: string;
  app: string;
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
  isReceiptPage?: boolean;
  org: string;
  app: string;
}

export interface IAddLayoutFulfilledAction {
  layouts: IFormLayouts;
  layoutOrder: string[];
  org: string;
  app: string;
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
  org: string;
  app: string;
}

export interface IDeleteComponentsAction {
  components: string[];
  org: string;
  app: string;
}

export interface IDeleteComponentAction {
  id: string;
  containerId: string;
  org: string;
  app: string;
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
  layouts?: IFormLayouts;
  isReceiptPage?: boolean;
  org: string;
  app: string;
}

export interface IFetchFormLayoutFulfilledAction {
  formLayout: IFormLayouts;
  invalidLayouts: string[];
}

export interface IFetchLayoutSettingsFulfilledAction {
  settings: ILayoutSettings;
}

export interface IUpdateActiveListAction {
  listItem: any;
  containerList: any;
  org: string;
  app: string;
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
  org: string;
  app: string;
}

export interface IUpdateContainerIdFulfilled {
  currentId: string;
  newId: string;
  org: string;
  app: string;
}

export interface IUpdateFormComponentAction {
  updatedComponent: IFormComponent;
  id: string;
  activeContainer?: string;
  org: string;
  app: string;
}

export interface IUpdateFormComponentActionFulfilled {
  updatedComponent: IFormComponent;
  id: string;
  org: string;
  app: string;
}

export interface IUpdateFormComponentIdAction {
  currentId: string;
  newId: string;
  org: string;
  app: string;
}

export interface IUpdateFormComponentOrderAction {
  updatedOrder: any;
  org: string;
  app: string;
}

export interface IUpdateFormContainerAction {
  updatedContainer: any;
  id: string;
  org: string;
  app: string;
}

export interface IUpdateLayoutNameAction {
  oldName: string;
  newName: string;
  org: string;
  app: string;
}

export interface IUpdateLayoutOrderAction {
  layout: string;
  direction: 'up' | 'down';
  org : string;
  app: string;
}

export interface IUpdateSelectedLayoutAction {
  selectedLayout: string;
  org : string;
  app: string;
}

export interface IUpdateReceiptLayoutNameAction {
  receiptLayoutName: string;
  org : string;
  app: string;
}
