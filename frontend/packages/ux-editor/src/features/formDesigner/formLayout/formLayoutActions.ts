import { createAction } from '@reduxjs/toolkit';
import type {
  IAddActiveFormContainerAction,
  IAddApplicationMetadataAction,
  IAddFormComponentsAction,
  IAddWidgetAction,
  IDeleteContainerAction,
  IUpdateActiveListAction, IUpdateContainerIdAction,
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
  addFormComponents: createAction<IAddFormComponentsAction>(`${moduleName}/addFormComponents`),
  addWidget: createAction<IAddWidgetAction>('formLayout/addWidget'),
  deleteActiveList: createAction<{org, app}>(`${moduleName}/deleteActiveList`),
  deleteFormContainer: createAction<IDeleteContainerAction>(`${moduleName}/deleteFormContainer`),
  updateActiveList: createAction<IUpdateActiveListAction>(`${moduleName}/updateActiveList`),
  updateFormComponentId: createAction<IUpdateFormComponentIdAction>(
    `${moduleName}/updateFormComponentId`
  ),
  updateContainerId: createAction<IUpdateContainerIdAction>(`${moduleName}/updateContainerId`),
  updateLayoutName: createAction<IUpdateLayoutNameAction>(`${moduleName}/updateLayoutName`),
};
