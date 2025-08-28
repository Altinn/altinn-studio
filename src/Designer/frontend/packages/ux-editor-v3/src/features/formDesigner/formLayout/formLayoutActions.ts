import { createAction } from '@reduxjs/toolkit';
import type {
  IAddApplicationMetadataAction,
  IAddFormComponentsAction,
  IAddWidgetAction,
  IDeleteContainerAction,
  IUpdateLayoutNameAction,
} from '../formDesignerTypes';

export const moduleName = 'formDesigner';
export const actions = {
  addApplicationMetadata: createAction<IAddApplicationMetadataAction>(
    `${moduleName}/addApplicationMetadata`,
  ),
  addApplicationMetadataFulfilled: createAction(`${moduleName}/addApplicationMetadataFulfilled`),
  addFormComponents: createAction<IAddFormComponentsAction>(`${moduleName}/addFormComponents`),
  addWidget: createAction<IAddWidgetAction>('formLayout/addWidget'),
  deleteFormContainer: createAction<IDeleteContainerAction>(`${moduleName}/deleteFormContainer`),
  updateLayoutName: createAction<IUpdateLayoutNameAction>(`${moduleName}/updateLayoutName`),
};
