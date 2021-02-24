import { createAction } from '@reduxjs/toolkit';
import * as FormDesignerTypes from '../formDesignerTypes';

export const moduleName = 'formDesigner';
export const actions = {
  addActiveFormContainer: createAction<FormDesignerTypes.IAddActiveFormContainerAction>(`${moduleName}/addActiveFormContainer`),
  addApplicationMetadata: createAction<FormDesignerTypes.IAddApplicationMetadataAction>(`${moduleName}/addApplicationMetadata`),
  addApplicationMetadataFulfilled: createAction(`${moduleName}/addApplicationMetadataFulfilled`),
  addFormComponent: createAction<FormDesignerTypes.IAddFormComponentAction>(`${moduleName}/addFormComponent`),
  addFormComponents: createAction<FormDesignerTypes.IAddFormComponentsAction>(`${moduleName}/addFormComponents`),
  addFormContainer: createAction<FormDesignerTypes.IAddFormContainerAction>(`${moduleName}/addFormContainer`),
  addLayout: createAction<FormDesignerTypes.IAddLayoutAction>(`${moduleName}/addLayout`),
  addWidget: createAction<FormDesignerTypes.IAddWidgetAction>('formLayout/addWidget'),
  deleteActiveList: createAction(`${moduleName}/deleteActiveList`),
  deleteApplicationMetadata: createAction<FormDesignerTypes.IDeleteApplicationMetadataAction>(`${moduleName}/deleteApplicationMetadata`),
  deleteApplicationMetadataFulfilled: createAction(`${moduleName}/deleteApplicationMetadataFulfilled`),
  deleteFormComponent: createAction<FormDesignerTypes.IDeleteComponentAction>(`${moduleName}/deleteFormComponent`),
  deleteFormContainer: createAction<FormDesignerTypes.IDeleteContainerAction>(`${moduleName}/deleteFormContainer`),
  deleteLayout: createAction<FormDesignerTypes.IDeleteLayoutAction>(`${moduleName}/deleteLayout`),
  fetchLayoutSettings: createAction(`${moduleName}/fetchLayoutSettings`),
  updateActiveList: createAction<FormDesignerTypes.IUpdateActiveListAction>(`${moduleName}/updateActiveList`),
  updateApplicationMetadata: createAction<FormDesignerTypes.IUpdateApplicationMetadaAction>(`${moduleName}/updateApplicationMetadata`),
  updateApplicationMetadataFulfilled: createAction(`${moduleName}/updateApplicationMetadataFulfilled`),
  updateFormComponentId: createAction<FormDesignerTypes.IUpdateFormComponentIdAction>(`${moduleName}/updateFormComponentId`),
  updateLayoutName: createAction<FormDesignerTypes.IUpdateLayoutNameAction>(`${moduleName}/updateLayoutName`),
};
