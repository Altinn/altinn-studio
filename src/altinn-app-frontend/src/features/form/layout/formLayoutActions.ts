import { ActionCreatorsMapObject, bindActionCreators } from 'redux';
import { INavigationConfig } from 'src/types';
import { store } from '../../../store';
import * as FetchForm from './fetch/fetchFormLayoutActions';
import * as UpdateFormLayout from './update/updateFormLayoutActions';
import { ILayouts } from '.';

export interface IFormLayoutActions extends ActionCreatorsMapObject {
  fetchFormLayout: (url: string) => FetchForm.IFetchFormLayout;
  fetchFormLayoutFulfilled: (layouts: ILayouts, navigationConfig: INavigationConfig)
    => FetchForm.IFetchFormLayoutFulfilled;
  fetchFormLayoutRejected: (error: Error) => FetchForm.IFetchFormLayoutRejected;
  updateFocus: (currentComponentId: string, step?: number) => UpdateFormLayout.IUpdateFocus;
  updateFocusFulfilled: (focusComponentId: string) => UpdateFormLayout.IUpdateFocusFulfilled;
  updateFocusRejected: (error: Error) => UpdateFormLayout.IUpdateFocusRejected;
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
  updateCurrentView: (newView: string) => UpdateFormLayout.IUpdateCurrentView;
}

const actions: IFormLayoutActions = {
  fetchFormLayout: FetchForm.fetchFormLayout,
  fetchFormLayoutFulfilled: FetchForm.fetchFormLayoutFulfilled,
  fetchFormLayoutRejected: FetchForm.fetchFormLayoutRejected,
  updateFocus: UpdateFormLayout.updateFocus,
  updateFocusFulfilled: UpdateFormLayout.updateFocusFulfilled,
  updateFocusRejected: UpdateFormLayout.updateFocusRejected,
  updateRepeatingGroups: UpdateFormLayout.updateRepeatingGroups,
  updateRepeatingGroupsFulfilled: UpdateFormLayout.updateRepeatingGroupsFulfilled,
  updateRepeatingGroupsRejected: UpdateFormLayout.updateRepeatingGroupsRejected,
  updateHiddenComponents: UpdateFormLayout.updateHiddenComponents,
  updateAutoSave: UpdateFormLayout.updateAutoSave,
  updateAutoSaveFulfilled: UpdateFormLayout.updateAutoSaveFulfilled,
  updateAutoSaveRejected: UpdateFormLayout.updateAutoSaveRejected,
  updateCurrentView: UpdateFormLayout.updateCurrentView,
};

const FormLayoutActions: IFormLayoutActions = bindActionCreators<any, any>(actions, store.dispatch);

export default FormLayoutActions;
