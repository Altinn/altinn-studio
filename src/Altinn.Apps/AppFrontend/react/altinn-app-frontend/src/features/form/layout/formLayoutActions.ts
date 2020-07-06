import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { ILayoutComponent, ILayoutGroup } from './index';
import { store } from '../../../store';
import * as FetchForm from './fetch/fetchFormLayoutActions';
import * as UpdateFormLayout from './update/updateFormLayoutActions';

export interface IFormLayoutActions extends ActionCreatorsMapObject {
  fetchFormLayout: (url: string) => FetchForm.IFetchFormLayout;
  fetchFormLayoutFulfilled: (layout: any) => FetchForm.IFetchFormLayoutFulfilled;
  fetchFormLayoutRejected: (error: Error) => FetchForm.IFetchFormLayoutRejected;
  updateFocus: (currentComponentId: string, step?: number) => UpdateFormLayout.IUpdateFocus;
  updateFocusFulfilled: (focusComponentId: string) => UpdateFormLayout.IUpdateFocusFulfilled;
  updateFocusRejected: (error: Error) => UpdateFormLayout.IUpdateFocusRejected;
  updateFormLayout: (formLayoutElement: ILayoutComponent | ILayoutGroup, index: number)
    => UpdateFormLayout.IUpdateFormLayout;
  updateRepeatingGroups: (layoutElementId: string, remove?: boolean, index?: number)
    => UpdateFormLayout.IUpdateRepeatingGroups;
  updateRepeatingGroupsFulfilled: (repeatingGroups: any)
    => UpdateFormLayout.IUpdateRepeatingGroupsFulfilled;
  updateRepeatingGroupsRejected: (error: Error)
    => UpdateFormLayout.IUpdateRepeatingGroupsRejected;
  updateHiddenComponents: (componentsToHide: string[]) => UpdateFormLayout.IUpdateHiddenComponents;
  updateAutoSave: (autoSave: boolean) => UpdateFormLayout.IUpdateAutoSave;
  updateAutoSaveFulfilled: (autoSave: boolean) => UpdateFormLayout.IUpdateAutoSaveFulfilled;
  updateAutoSaveRejected: (error: Error) => UpdateFormLayout.IUpdateAutoSaveRejected;
}

const actions: IFormLayoutActions = {
  fetchFormLayout: FetchForm.fetchFormLayout,
  fetchFormLayoutFulfilled: FetchForm.fetchFormLayoutFulfilled,
  fetchFormLayoutRejected: FetchForm.fetchFormLayoutRejected,
  updateFocus: UpdateFormLayout.updateFocus,
  updateFocusFulfilled: UpdateFormLayout.updateFocusFulfilled,
  updateFocusRejected: UpdateFormLayout.updateFocusRejected,
  updateFormLayout: UpdateFormLayout.updateFormLayout,
  updateRepeatingGroups: UpdateFormLayout.updateRepeatingGroups,
  updateRepeatingGroupsFulfilled: UpdateFormLayout.updateRepeatingGroupsFulfilled,
  updateRepeatingGroupsRejected: UpdateFormLayout.updateRepeatingGroupsRejected,
  updateHiddenComponents: UpdateFormLayout.updateHiddenComponents,
  updateAutoSave: UpdateFormLayout.updateAutoSave,
  updateAutoSaveFulfilled: UpdateFormLayout.updateAutoSaveFulfilled,
  updateAutoSaveRejected: UpdateFormLayout.updateAutoSaveRejected,
};

const FormLayoutActions: IFormLayoutActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormLayoutActions;
