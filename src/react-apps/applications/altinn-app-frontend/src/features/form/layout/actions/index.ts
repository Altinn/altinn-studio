import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { ILayoutComponent, ILayoutGroup } from '..';
import { store } from '../../../../store';
import * as FetchForm from './fetch';
import * as UpdateFormLayout from './update';

export interface IFormLayoutActions extends ActionCreatorsMapObject {
  fetchFormLayout: (url: string) => FetchForm.IFetchFormLayout;
  fetchFormLayoutFulfilled: (layout: any) => FetchForm.IFetchFormLayoutFulfilled;
  fetchFormLayoutRejected: (error: Error) => FetchForm.IFetchFormLayoutRejected;
  updateFocus: (currentComponentId: string, step?: number) => UpdateFormLayout.IUpdateFocus;
  updateFocusFulfilled: (focusComponentId: string) => UpdateFormLayout.IUpdateFocusFulfilled;
  updateFocusRejected: (error: Error) => UpdateFormLayout.IUpdateFocusRejected;
  updateFormLayout: (formLayoutElement: ILayoutComponent | ILayoutGroup, index: number)
    => UpdateFormLayout.IUpdateFormLayout;
  updateHiddenComponents: (componentsToHide: string[]) => UpdateFormLayout.IUpdateHiddenComponents;
}

const actions: IFormLayoutActions = {
  fetchFormLayout: FetchForm.fetchFormLayout,
  fetchFormLayoutFulfilled: FetchForm.fetchFormLayoutFulfilled,
  fetchFormLayoutRejected: FetchForm.fetchFormLayoutRejected,
  updateFocus: UpdateFormLayout.updateFocus,
  updateFocusFulfilled: UpdateFormLayout.updateFocusFulfilled,
  updateFocusRejected: UpdateFormLayout.updateFocusRejected,
  updateFormLayout: UpdateFormLayout.updateFormLayout,
  updateHiddenComponents: UpdateFormLayout.updateHiddenComponents,
};

const FormLayoutActions: IFormLayoutActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormLayoutActions;
