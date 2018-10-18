import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FormDesignerActions from './actions';
import { IGenerateRepeatingGroupsAction, IGenerateRepeatingGroupsActionFulfilled, IGenerateRepeatingGroupsActionRejected } from './actions';

export interface IFormDesignerActionDispatchers
  extends ActionCreatorsMapObject {
  addFormComponent: (
    component: ICreateFormComponent,
    containerId?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddFormComponentAction;
  addFormComponentFulfilled: (
    component: any,
    id: string,
    containerId?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddFormComponentActionFulfilled;
  addFormComponentRejected: (
    error: Error,
  ) => FormDesignerActions.IAddFormComponentActionRejected;
  addFormContainer: (
    container: ICreateFormContainer,
    positionAfterId?: string,
    callback?: (...args: any[]) => any,
  ) => FormDesignerActions.IAddFormContainerAction;
  addFormContainerFulfilled: (
    container: ICreateFormContainer,
    id: string,
    positionAfterId?: string,
    baseContainerId?: string,
    callback?: (...args: any[]) => any,
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
  deleteFormComponent: (
    id: string,
  ) => FormDesignerActions.IDeleteComponentAction;
  deleteFormComponentFulfilled: (
    id: string,
    containerId: string,
  ) => FormDesignerActions.IDeleteComponentActionFulfilled;
  deleteFormComponentRejected: (
    error: Error,
  ) => FormDesignerActions.IDeleteComponentActionRejected;
  deleteFormContainer: (
    id: string,
  ) => FormDesignerActions.IDeleteContainerAction;
  deleteFormContainerFulfilled: (
    id: string,
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
  saveFormLayout: (url: string) => FormDesignerActions.ISaveFormLayoutAction;
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
  deleteFormComponent: FormDesignerActions.deleteComponentAction,
  deleteFormComponentFulfilled:
    FormDesignerActions.deleteComponentActionFulfilled,
  deleteFormComponentRejected:
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
  selectFormComponentRejected:
    FormDesignerActions.selectLayoutElementActionRejected,
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
  updateFormContainerRejected: FormDesignerActions.updateFormContainerActionRejected
};

const FormDesignerActionDispatchers: IFormDesignerActionDispatchers = bindActionCreators<
  any,
  IFormDesignerActionDispatchers
  >(actions, store.dispatch);
export default FormDesignerActionDispatchers;
