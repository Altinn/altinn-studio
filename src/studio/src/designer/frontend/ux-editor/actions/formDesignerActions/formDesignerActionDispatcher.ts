import { ILayoutSettings } from 'app-shared/types';
import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FormDesignerActions from './actions';
import { IGenerateRepeatingGroupsAction, IGenerateRepeatingGroupsActionFulfilled, IGenerateRepeatingGroupsActionRejected } from './actions';

export interface IFormDesignerActionDispatchers
  extends ActionCreatorsMapObject {
  addFormComponent: (
    component: ICreateFormComponent,
    position: number,
    containerId?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddFormComponentAction;
  addFormComponentFulfilled: (
    component: any,
    id: string,
    position: number,
    containerId?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddFormComponentActionFulfilled;
  addFormComponentRejected: (
    error: Error,
  ) => FormDesignerActions.IAddFormComponentActionRejected;
  addFormContainer: (
    container: ICreateFormContainer,
    positionAfterId?: string,
    addToId?: string,
    callback?: (...args: any[]) => any,
    destinationIndex?: number,
  ) => FormDesignerActions.IAddFormContainerAction;
  addFormContainerFulfilled: (
    container: ICreateFormContainer,
    id: string,
    positionAfterId?: string,
    addToId?: string,
    baseContainerId?: string,
    callback?: (...args: any[]) => any,
    destinationIndex?: number,
  ) => FormDesignerActions.IAddFormContainerActionFulfilled;
  addFormContainerRejected: (
    error: Error,
  ) => FormDesignerActions.IAddFormContainerActionRejected;
  addActiveFormContainer: (
    id?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddActiveFormContainerAction;
  addActiveFormContainerFulfilled: (
    id: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddActiveFormContainerActionFulfilled;
  addActiveFormContainerRejected: (
    error: Error,
  ) => FormDesignerActions.IAddActiveFormContainerRejected;
  createRepeatingGroup: (
    id: string,
  ) => FormDesignerActions.ICreateRepeatingGroupAction;
  createRepeatingGroupFulfilled: (
  ) => Action;
  createRepeatingGroupRejected: (
    error: Error,
  ) => FormDesignerActions.ICreateRepeatingGroupRejected;
  deleteActiveListAction: (
  ) => Action;
  deleteActiveListActionFulfilled: (
  ) => Action;
  deleteActiveListActionRejected: (
    error: Error,
  ) => FormDesignerActions.IDeleteActiveListActionRejected;
  deleteFormComponents: (
    components: string[],
  ) => FormDesignerActions.IDeleteComponentsAction;
  deleteFormComponentFulfilled: (
    id: string,
    containerId: string,
  ) => FormDesignerActions.IDeleteComponentActionFulfilled;
  deleteFormComponentsRejected: (
    error: Error,
  ) => FormDesignerActions.IDeleteComponentsActionRejected;
  deleteFormContainer: (
    id: string,
    index?: number,
    parentContainerId?: string,
  ) => FormDesignerActions.IDeleteContainerAction;
  deleteFormContainerFulfilled: (
    id: string,
    index?: number,
    parentContainerId?: string,
  ) => FormDesignerActions.IDeleteContainerActionFulfilled;
  deleteFormContainerRejected: (
    error: Error,
  ) => FormDesignerActions.IDeleteContainerActionRejected;
  fetchFormLayout: (url: string) => FormDesignerActions.IFetchFormLayoutAction;
  fetchFormLayoutFulfilled: (
    formLayout: any,
  ) => FormDesignerActions.IFetchFormLayoutFulfilledAction;
  fetchFormLayoutRejected: (
    error: Error,
  ) => FormDesignerActions.IFetchFormLayoutRejectedAction;
  generateRepeatingGroupsAction: () => IGenerateRepeatingGroupsAction;
  generateRepeatingGroupsActionFulfilled: () => IGenerateRepeatingGroupsActionFulfilled;
  generateRepeatingGroupsActionRejected: (error: Error) => IGenerateRepeatingGroupsActionRejected;
  saveFormLayout: () => Action;
  saveFormLayoutFulfilled: () => Action;
  saveFormLayoutRejected: (
    error: Error,
  ) => FormDesignerActions.ISaveFormLayoutRejectedAction;
  selectFormComponent: (
    id: string,
  ) => FormDesignerActions.ISelectLayoutElementAction;
  selectFormComponentFulfilled: () => Action;
  selectFormComponentRejected: (
    error: Error,
  ) => FormDesignerActions.ISelectLayoutElementActionRejected;
  updateActiveList: (
    listItem: any,
    containerList: any,
  ) => FormDesignerActions.IUpdateActiveListAction;
  updateActiveListActionFulfilled: (
    containerList: any,
  ) => FormDesignerActions.IUpdateActiveListActionFulfilled;
  updateActiveListActionRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateActiveListActionRejected;
  updateActiveListOrder: (
    containerList: any,
    orderList: any[],
  ) => FormDesignerActions.IUpdateActiveListOrderAction;
  updateActiveListOrderActionFulfilled: (
    containerList: any,
  ) => FormDesignerActions.IUpdateActiveListOrderActionFulfilled;
  updateActiveListOrderActionRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateActiveListOrderActionRejected;
  updateDataModelBinding: (
    id: string,
    modelBinding: string,
  ) => FormDesignerActions.IUpdateDataModelBindingAction;
  updateDataModelBindingFulfilled: (
    id: string,
    modelBinding: string,
  ) => FormDesignerActions.IUpdateDataModelBindingActionFulfilled;
  updateDataModelBindingRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateDataModelBindingActionRejected;
  updateFormComponent: (
    updatedComponent: any,
    id: string,
    activeFormContainer?: string,
  ) => FormDesignerActions.IUpdateFormComponentAction;
  updateFormComponentFulfilled: (
    updatedComponent: any,
    id: string,
  ) => FormDesignerActions.IUpdateFormComponentActionFulfilled;
  updateFormComponentRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateFormComponentActionRejected;
  updateFormContainer: (
    updatedContainer: ICreateFormContainer,
    id: string,
  ) => FormDesignerActions.IUpdateFormContainerAction;
  updateFormContainerFulfilled: (
    updatedContainer: ICreateFormContainer,
    id: string,
  ) => FormDesignerActions.IUpdateFormContainerActionFulfilled;
  updateFormContainerRejected: (
    error: any,
  ) => FormDesignerActions.IUpdateFormContainerActionRejected;
  toggleFormContainerRepeat: (
    id: string,
  ) => FormDesignerActions.IToggleFormContainerRepeatAction;
  updateFormComponentOrderAction: (
    updatedOrder: any,
  ) => FormDesignerActions.IUpdateFormComponentOrderAction;
  updateFormComponentOrderActionFulfilled: (
    updatedOrder: any,
  ) => FormDesignerActions.IUpdateFormComponentOrderActionFulfilled;
  updateFormComponentOrderActionRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateFormComponentOrderActionRejected;
  addApplicationMetadata: (
    id: string,
    maxFiles: number,
    minFiles: number,
    maxSize: number,
    fileType: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddApplicationMetadataAction;
  addApplicationMetadataFulfilled: (
  ) => Action;
  addApplicationMetadataRejected: (
    error: Error,
  ) => FormDesignerActions.IAddApplicationMetadataActionRejected;
  deleteApplicationMetadata: (
    id: string,
  ) => FormDesignerActions.IDeleteApplicationMetadataAction;
  deleteApplicationMetadataFulfilled: (
  ) => Action;
  deleteApplicationMetadataRejected: (
    error: Error,
  ) => FormDesignerActions.IDeleteApplicationMetadataActionRejected;
  updateApplicationMetadata: (
    id: string,
    maxFiles: number,
    minFiles: number,
    maxSize: number,
    fileType: string,
  ) => FormDesignerActions.IUpdateApplicationMetadaAction;
  updateApplicationMetadataFulfilled: (
  ) => Action;
  updateApplicationMetadataRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateApplicationMetadaActionRejected;
  updateContainerId: (
    currentId: string,
    newId: string,
  ) => FormDesignerActions.IUpdateContainerIdAction;
  updateContainerIdFulfilled: (
    currentId: string,
    newId: string,
  ) => FormDesignerActions.IUpdateContainerIdFulfilled;
  updateContainerIdRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateContainerIdRejectedAction;
  updateSelectedLayout: (
    selectedLayout: string,
  ) => FormDesignerActions.IUpdateSelectedLayoutAction;
  updateSelectedLayoutFulfilled: (
    selectedLayout: string,
  ) => FormDesignerActions.IUpdateSelectedLayoutFulfilledAction;
  updateSelectedLayoutRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateSelectedLayoutRejectedAction;
  addLayout: (
    layout: string
  ) => FormDesignerActions.IAddLayoutAction;
  addLayoutFulfilled: (
    layouts: IFormLayouts
  ) => FormDesignerActions.IAddLayoutFulfilledAction;
  addLayoutRejected: (
    error: Error,
  ) => FormDesignerActions.IAddLayoutRejectedAction;
  deleteLayout: (
    layout: string
  ) => FormDesignerActions.IDeleteLayoutAction;
  deleteLayoutFulfilled: (
    layout: string
  ) => FormDesignerActions.IDeleteLayoutFulfilledAction;
  deleteLayoutRejected: (
    error: Error
  ) => FormDesignerActions.IDeleteLayoutRejectedAction;
  updateLayoutName: (
    oldName: string,
    newName: string,
  ) => FormDesignerActions.IUpdateLayoutNameAction;
  updateLayoutNameFulfilled: (
    oldName: string,
    newName: string,
  ) => FormDesignerActions.IUpdateLayoutNameFulfilledAction;
  updateLayoutNameRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateLayoutNameRejectedAction;
  updateLayoutOrder: (
    layout: string,
    direction: 'up' | 'down',
  ) => FormDesignerActions.IUpdateLayoutOrderAction;
  updateLayoutOrderFulfilled: (
    layout: string,
    direction: 'up' | 'down',
  ) => FormDesignerActions.IUpdateLayoutOrderFulfilledAction;
  updateLayoutOrderRejected: (
    error: Error,
  ) => FormDesignerActions.IUpdateLayoutOrderRejectedAction;
  fetchLayoutSettings: () => Action;
  fetchLayoutSettingsFulfilled: (
    settings: ILayoutSettings,
  ) => FormDesignerActions.IFetchLayoutSettingsFulfilledAction;
  fetchLayoutSettingsRejected: (
    error: Error,
  ) => FormDesignerActions.IFetchLayoutSettingsRejectedAction;
}

const actions: IFormDesignerActionDispatchers = {
  addFormComponent: FormDesignerActions.addFormComponentAction,
  addFormComponentFulfilled:
    FormDesignerActions.addFormComponentActionFulfilled,
  addFormComponentRejected: FormDesignerActions.addFormComponentActionRejected,
  addFormContainer: FormDesignerActions.addFormContainerAction,
  addFormContainerFulfilled: FormDesignerActions.addFormContainerActionFulfilled,
  addFormContainerRejected: FormDesignerActions.addFormContainerActionRejected,
  addActiveFormContainer: FormDesignerActions.addActiveFormContainerAction,
  addActiveFormContainerFulfilled: FormDesignerActions.addActiveFormContainerActionFulfilled,
  addActiveFormContainerRejected: FormDesignerActions.addActiveFormContainerRejected,
  createRepeatingGroup: FormDesignerActions.createRepeatingGroupAction,
  createRepeatingGroupFulfilled: FormDesignerActions.createRepeatingGroupFulfilled,
  createRepeatingGroupRejected: FormDesignerActions.createRepeatingGroupRejected,
  deleteActiveListAction: FormDesignerActions.deleteActiveListAction,
  deleteActiveListActionFulfilled: FormDesignerActions.deleteActiveListActionFulfilled,
  deleteActiveListActionRejected: FormDesignerActions.deleteActiveListActionRejected,
  deleteFormComponents: FormDesignerActions.deleteComponentAction,
  deleteFormComponentFulfilled:
    FormDesignerActions.deleteComponentActionFulfilled,
  deleteFormComponentsRejected:
    FormDesignerActions.deleteComponentActionRejected,
  deleteFormContainer: FormDesignerActions.deleteContainerAction,
  deleteFormContainerFulfilled: FormDesignerActions.deleteContainerActionFulfilled,
  deleteFormContainerRejected: FormDesignerActions.deleteContainerActionRejected,
  fetchFormLayout: FormDesignerActions.fetchFormLayout,
  fetchFormLayoutFulfilled: FormDesignerActions.fetchFormLayoutFulfilled,
  fetchFormLayoutRejected: FormDesignerActions.fetchFormLayoutRejected,
  generateRepeatingGroupsAction: FormDesignerActions.generateRepeatingGroupsAction,
  generateRepeatingGroupsActionFulfilled: FormDesignerActions.generateRepeatingGroupsActionFulfilled,
  generateRepeatingGroupsActionRejected: FormDesignerActions.generateRepeatingGroupsActionRejected,
  saveFormLayout: FormDesignerActions.saveFormLayoutAction,
  saveFormLayoutFulfilled: FormDesignerActions.saveFormLayoutActionFulfilled,
  saveFormLayoutRejected: FormDesignerActions.saveFormLayoutActionRejected,
  selectFormComponent: FormDesignerActions.selectLayoutElementAction,
  selectFormComponentFulfilled:
    FormDesignerActions.selectLayoutElementActionFulfilled,
  selectFormComponentRejected: FormDesignerActions.selectLayoutElementActionRejected,
  updateActiveList: FormDesignerActions.updateActiveListAction,
  updateActiveListActionFulfilled: FormDesignerActions.updateActiveListActionFulfilled,
  updateActiveListActionRejected: FormDesignerActions.updateActiveListActionRejected,
  updateActiveListOrder: FormDesignerActions.updateActiveListOrderAction,
  updateActiveListOrderActionFulfilled: FormDesignerActions.updateActiveListOrderActionFulfilled,
  updateActiveListOrderActionRejected: FormDesignerActions.updateActiveListOrderActionRejected,
  updateDataModelBinding: FormDesignerActions.updateDataModelBindingAction,
  updateDataModelBindingFulfilled:
    FormDesignerActions.updateDataModelBindingActionFulfilled,
  updateDataModelBindingRejected:
    FormDesignerActions.updateDataModelBindingActionRejected,
  updateFormComponent: FormDesignerActions.updateFormComponentAction,
  updateFormComponentFulfilled:
    FormDesignerActions.updateFormComponentActionFulfilled,
  updateFormComponentRejected:
    FormDesignerActions.updateFormComponentActionRejected,
  updateFormContainer: FormDesignerActions.updateFormContainerAction,
  updateFormContainerFulfilled: FormDesignerActions.updateFormContainerActionFulfilled,
  updateFormContainerRejected: FormDesignerActions.updateFormContainerActionRejected,
  toggleFormContainerRepeat: FormDesignerActions.toggleFormContainerRepeatAction,
  updateFormComponentOrderAction: FormDesignerActions.updateFormComponentOrderAction,
  updateFormComponentOrderActionFulfilled: FormDesignerActions.updateFormComponentOrderActionFulfilled,
  updateFormComponentOrderActionRejected: FormDesignerActions.updateFormComponentOrderActionRejected,
  addApplicationMetadata: FormDesignerActions.addApplicationMetadataAction,
  addApplicationMetadataFulfilled:
    FormDesignerActions.addApplicationMetadataActionFulfilled,
  addApplicationMetadataRejected: FormDesignerActions.addApplicationMetadataActionRejected,
  deleteApplicationMetadata: FormDesignerActions.deleteApplicationMetadataAction,
  deleteApplicationMetadataFulfilled:
    FormDesignerActions.deleteApplicationMetadataActionFulfilled,
  deleteApplicationMetadataRejected: FormDesignerActions.deleteApplicationMetadataActionRejected,
  updateApplicationMetadata: FormDesignerActions.updateApplicationMetadaAction,
  updateApplicationMetadataFulfilled:
    FormDesignerActions.updateApplicationMetadaActionFulfilled,
  updateApplicationMetadataRejected: FormDesignerActions.updateApplicationMetadaActionRejected,
  updateContainerId: FormDesignerActions.updateContainerId,
  updateContainerIdFulfilled: FormDesignerActions.updateContainerIdFulfilled,
  updateContainerIdRejected: FormDesignerActions.updateContainerIdRejected,
  updateSelectedLayout: FormDesignerActions.updateSelectedLayout,
  updateSelectedLayoutFulfilled: FormDesignerActions.updateSelectedLayoutFulfilled,
  updateSelectedLayoutRejected: FormDesignerActions.updateSelectedLayoutRejected,
  addLayout: FormDesignerActions.addLayout,
  addLayoutFulfilled: FormDesignerActions.addLayoutFulfilled,
  addLayoutRejected: FormDesignerActions.addLayoutRejected,
  deleteLayout: FormDesignerActions.deleteLayout,
  deleteLayoutFulfilled: FormDesignerActions.deleteLayoutFulfilled,
  deleteLayoutRejected: FormDesignerActions.deleteLayoutRejected,
  updateLayoutName: FormDesignerActions.updateLayoutName,
  updateLayoutNameFulfilled: FormDesignerActions.updateLayoutNameFulfilled,
  updateLayoutNameRejected: FormDesignerActions.updateLayoutNameRejected,
  updateLayoutOrder: FormDesignerActions.updateLayoutOrder,
  updateLayoutOrderFulfilled: FormDesignerActions.updateLayoutOrderFulfilled,
  updateLayoutOrderRejected: FormDesignerActions.updateLayoutOrderRejected,
  fetchLayoutSettings: FormDesignerActions.fetchLayoutSettings,
  fetchLayoutSettingsFulfilled: FormDesignerActions.fetchLayoutSettingsFulfilled,
  fetchLayoutSettingsRejected: FormDesignerActions.fetchLayoutSettingsRejected,
};

const FormDesignerActionDispatchers: IFormDesignerActionDispatchers = bindActionCreators<
  any,
  IFormDesignerActionDispatchers
>(actions, store.dispatch);
export default FormDesignerActionDispatchers;
