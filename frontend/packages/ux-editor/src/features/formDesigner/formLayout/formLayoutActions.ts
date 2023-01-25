import { createAction } from '@reduxjs/toolkit';
import type {
  IAddActiveFormContainerAction,
  IAddApplicationMetadataAction,
  IAddFormComponentAction,
  IAddFormComponentsAction,
  IAddFormContainerAction,
  IAddLayoutAction,
  IAddWidgetAction,
  IDeleteApplicationMetadataAction,
  IDeleteComponentAction,
  IDeleteContainerAction,
  IDeleteLayoutAction,
  IUpdateActiveListAction,
  IUpdateApplicationMetadaAction,
  IUpdateFormComponentIdAction,
  IUpdateLayoutNameAction,
} from '../formDesignerTypes';

export const moduleName = 'formDesigner';
export const actions = {
  addActiveFormContainer: createAction<IAddActiveFormContainerAction>(
    `${moduleName}/addActiveFormContainer`
  ),
  addApplicationMetadata: createAction<IAddApplicationMetadataAction>(
    `${moduleName}/addApplicationMetadata`
  ),
  addApplicationMetadataFulfilled: createAction(`${moduleName}/addApplicationMetadataFulfilled`),
  addFormComponent: createAction<IAddFormComponentAction>(`${moduleName}/addFormComponent`),
  addFormComponents: createAction<IAddFormComponentsAction>(`${moduleName}/addFormComponents`),
  addFormContainer: createAction<IAddFormContainerAction>(`${moduleName}/addFormContainer`),
  addLayout: createAction<IAddLayoutAction>(`${moduleName}/addLayout`),
  addWidget: createAction<IAddWidgetAction>('formLayout/addWidget'),
  deleteActiveList: createAction(`${moduleName}/deleteActiveList`),
  deleteApplicationMetadata: createAction<IDeleteApplicationMetadataAction>(
    `${moduleName}/deleteApplicationMetadata`
  ),
  deleteApplicationMetadataFulfilled: createAction(
    `${moduleName}/deleteApplicationMetadataFulfilled`
  ),
  deleteFormComponent: createAction<IDeleteComponentAction>(`${moduleName}/deleteFormComponent`),
  deleteFormContainer: createAction<IDeleteContainerAction>(`${moduleName}/deleteFormContainer`),
  deleteLayout: createAction<IDeleteLayoutAction>(`${moduleName}/deleteLayout`),
  fetchLayoutSettings: createAction(`${moduleName}/fetchLayoutSettings`),
  updateActiveList: createAction<IUpdateActiveListAction>(`${moduleName}/updateActiveList`),
  updateApplicationMetadata: createAction<IUpdateApplicationMetadaAction>(
    `${moduleName}/updateApplicationMetadata`
  ),
  updateApplicationMetadataFulfilled: createAction(
    `${moduleName}/updateApplicationMetadataFulfilled`
  ),
  updateFormComponentId: createAction<IUpdateFormComponentIdAction>(
    `${moduleName}/updateFormComponentId`
  ),
  updateLayoutName: createAction<IUpdateLayoutNameAction>(`${moduleName}/updateLayoutName`),
};
