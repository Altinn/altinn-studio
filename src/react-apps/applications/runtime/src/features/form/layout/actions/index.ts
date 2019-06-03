import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { ILayoutComponent, ILayoutGroup } from '..';
import { store } from '../../../../store';
import * as FetchForm from './fetch';
import * as UpdateFormLayout from './update';

export interface IFormLayoutActions extends ActionCreatorsMapObject {
  fetchFormLayout: (url: string) => FetchForm.IFetchFormLayout;
  fetchFormLayoutFulfilled: (layout: any) => FetchForm.IFetchFormLayoutFulfilled;
  fetchFormLayoutRejected: (error: Error) => FetchForm.IFetchFormLayoutRejected;
  updateFormLayout: (formLayoutElement: ILayoutComponent | ILayoutGroup, index: number)
    => UpdateFormLayout.IUpdateFormLayout;
}

const actions: IFormLayoutActions = {
  fetchFormLayout: FetchForm.fetchFormLayout,
  fetchFormLayoutFulfilled: FetchForm.fetchFormLayoutFulfilled,
  fetchFormLayoutRejected: FetchForm.fetchFormLayoutRejected,
  updateFormLayout: UpdateFormLayout.updateFormLayout,
};

const FormLayoutActions: IFormLayoutActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormLayoutActions;
