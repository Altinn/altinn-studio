/* eslint-disable max-len */
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ILayoutSets, IUiConfig } from 'src/types';
import { ILayouts } from './index';
import * as LayoutTypes from './formLayoutTypes';

export interface ILayoutState {
  layouts: ILayouts;
  error: Error;
  uiConfig: IUiConfig;
  layoutsets: ILayoutSets;
}

const initialState: ILayoutState = {
  layouts: null,
  error: null,
  uiConfig: {
    focus: null,
    hiddenFields: [],
    autoSave: null,
    repeatingGroups: {},
    currentView: 'FormLayout',
    navigationConfig: {},
    layoutOrder: null,
    pageTriggers: []
  },
  layoutsets: null,
};

const moduleName = 'formLayout';

const formLayoutSlice = createSlice({
  name: moduleName,
  initialState,
  reducers: {
    fetchLayoutFulfilled: (state, action: PayloadAction<LayoutTypes.IFetchLayoutFulfilled>) => {
      const { layouts, navigationConfig } = action.payload;
      state.layouts = layouts;
      state.uiConfig.navigationConfig = navigationConfig;
      state.uiConfig.layoutOrder = Object.keys(layouts);
      state.error = null;
    },
    fetchLayoutRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchLayoutSetsFulfilled: (state, action: PayloadAction<LayoutTypes.IFetchLayoutSetsFulfilled>) => {
      const { layoutSets } = action.payload;
      state.layoutsets = layoutSets;
    },
    fetchLayoutSetsRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    fetchLayoutSettingsFulfilled: (state, action: PayloadAction<LayoutTypes.IFetchLayoutSettingsFulfilled>) => {
      const { settings } = action.payload;
      if (settings && settings.pages) {
        state.uiConfig.hideCloseButton = settings?.pages?.hideCloseButton;
        state.uiConfig.pageTriggers = settings.pages.triggers;
        if (settings.pages.order) {
          state.uiConfig.layoutOrder = settings.pages.order;
          if (state.uiConfig.currentViewCacheKey) {
            state.uiConfig.currentView = localStorage.getItem(state.uiConfig.currentViewCacheKey)
              || settings.pages.order[0];
          } else {
            state.uiConfig.currentView = settings.pages.order[0];
          }
        }
      }
    },
    fetchLayoutSettingsRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    setCurrentViewCacheKey: (state, action: PayloadAction<LayoutTypes.ISetCurrentViewCacheKey>) => {
      const { key } = action.payload;
      state.uiConfig.currentViewCacheKey = key;
    },
    updateAutoSave: (state, action: PayloadAction<LayoutTypes.IUpdateAutoSave>) => {
      const { autoSave } = action.payload;
      state.uiConfig.autoSave = autoSave;
    },
    updateCurrentViewFulfilled: (state, action: PayloadAction<LayoutTypes.IUpdateCurrentViewFulfilled>) => {
      const { newView, returnToView } = action.payload;
      state.uiConfig.currentView = newView;
      state.uiConfig.returnToView = returnToView;
    },
    updateCurrentViewRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateFocusFulfilled: (state, action: PayloadAction<LayoutTypes.IUpdateFocusFulfilled>) => {
      const { focusComponentId } = action.payload;
      state.uiConfig.focus = focusComponentId;
    },
    updateFocusRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateHiddenComponents: (state, action: PayloadAction<LayoutTypes.IUpdateHiddenComponents>) => {
      const { componentsToHide } = action.payload;
      state.uiConfig.hiddenFields = componentsToHide;
    },
    updateRepeatingGroupsFulfilled: (state, action: PayloadAction<LayoutTypes.IUpdateRepeatingGroupsFulfilled>) => {
      const { repeatingGroups } = action.payload;
      state.uiConfig.repeatingGroups = repeatingGroups;
    },
    updateRepeatingGroupsRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    updateRepeatingGroupsEditIndexFulfilled: (state, action: PayloadAction<LayoutTypes.IUpdateRepeatingGroupsEditIndexFulfilled>) => {
      const { group, index } = action.payload;
      state.uiConfig.repeatingGroups[group].editIndex = index;
    },
    updateRepeatingGroupsEditIndexRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
    calculatePageOrderAndMoveToNextPageFulfilled: (state, action: PayloadAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPageFulfilled>) => {
      const { order } = action.payload;
      state.uiConfig.layoutOrder = order;
    },
    calculatePageOrderAndMoveToNextPageRejected: (state, action: PayloadAction<LayoutTypes.IFormLayoutActionRejected>) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

const actions = {
  calculatePageOrderAndMoveToNextPage: createAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPage>(`${moduleName}/calculatePageOrderAndMoveToNextPage`),
  fetchLayout: createAction(`${moduleName}/fetchLayout`),
  fetchLayoutSets: createAction(`${moduleName}/fetchLayoutSets`),
  fetchLayoutSettings: createAction(`${moduleName}/fetchLayoutSettings`),
  updateCurrentView: createAction<LayoutTypes.IUpdateCurrentView>(`${moduleName}/updateCurrentView`),
  updateFocus: createAction<LayoutTypes.IUpdateFocus>(`${moduleName}/updateFocus`),
  updateRepeatingGroups: createAction<LayoutTypes.IUpdateRepeatingGroups>(`${moduleName}/updateRepeatingGroups`),
  updateRepeatingGroupsEditIndex: createAction<LayoutTypes.IUpdateRepeatingGroupsEditIndex>(`${moduleName}/updateRepeatingGroupsEditIndex`),
  initRepeatingGroups: createAction(`${moduleName}/initRepeatingGroups`),
};

export const FormLayoutActions = {
  ...actions,
  ...formLayoutSlice.actions,
};

export default formLayoutSlice.reducer;
