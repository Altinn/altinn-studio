import { Action, ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { store } from '../../store';
import * as FormDesignerActions from './actions';
import { IGenerateRepeatingGroupsAction, IGenerateRepeatingGroupsActionFulfilled, IGenerateRepeatingGroupsActionRejected } from './actions';

export interface IFormDesignerActionDispatchers
  extends ActionCreatorsMapObject {
  createRepeatingGroup: (
    id: string,
  ) => FormDesignerActions.ICreateRepeatingGroupAction;
  createRepeatingGroupFulfilled: (
  ) => Action;
  createRepeatingGroupRejected: (
    error: Error,
  ) => FormDesignerActions.ICreateRepeatingGroupRejected;
  generateRepeatingGroupsAction: () => IGenerateRepeatingGroupsAction;
  generateRepeatingGroupsActionFulfilled: () => IGenerateRepeatingGroupsActionFulfilled;
  generateRepeatingGroupsActionRejected: (error: Error) => IGenerateRepeatingGroupsActionRejected;
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
}

const actions: IFormDesignerActionDispatchers = {
  createRepeatingGroup: FormDesignerActions.createRepeatingGroupAction,
  createRepeatingGroupFulfilled: FormDesignerActions.createRepeatingGroupFulfilled,
  createRepeatingGroupRejected: FormDesignerActions.createRepeatingGroupRejected,
  generateRepeatingGroupsAction: FormDesignerActions.generateRepeatingGroupsAction,
  generateRepeatingGroupsActionFulfilled: FormDesignerActions.generateRepeatingGroupsActionFulfilled,
  generateRepeatingGroupsActionRejected: FormDesignerActions.generateRepeatingGroupsActionRejected,
  selectFormComponent: FormDesignerActions.selectLayoutElementAction,
  selectFormComponentFulfilled:
    FormDesignerActions.selectLayoutElementActionFulfilled,
  selectFormComponentRejected: FormDesignerActions.selectLayoutElementActionRejected,
  updateDataModelBinding: FormDesignerActions.updateDataModelBindingAction,
  updateDataModelBindingFulfilled:
    FormDesignerActions.updateDataModelBindingActionFulfilled,
  updateDataModelBindingRejected:
    FormDesignerActions.updateDataModelBindingActionRejected,
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
};

const FormDesignerActionDispatchers: IFormDesignerActionDispatchers = bindActionCreators<
  any,
  IFormDesignerActionDispatchers
>(actions, store.dispatch);
export default FormDesignerActionDispatchers;
