import { put } from 'redux-saga/effects';

import {
  fetchLayoutSetsSaga,
  watchFetchFormLayoutSaga,
  watchFetchFormLayoutSettingsSaga,
} from 'src/features/form/layout/fetch/fetchFormLayoutSagas';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  findAndMoveToNextVisibleLayout,
  updateFileUploaderWithTagChosenOptionsSaga,
  updateFileUploaderWithTagEditIndexSaga,
  updateRepeatingGroupEditIndexSaga,
  updateRepeatingGroupsSaga,
  watchInitialCalculatePageOrderAndMoveToNextPageSaga,
  watchInitRepeatingGroupsSaga,
  watchMapFileUploaderWithTagSaga,
  watchUpdateCurrentViewSaga,
} from 'src/features/form/layout/update/updateFormLayoutSagas';
import { DataListsActions } from 'src/shared/resources/dataLists/dataListsSlice';
import { OptionsActions } from 'src/shared/resources/options/optionsSlice';
import { replaceTextResourcesSaga } from 'src/shared/resources/textResources/replace/replaceTextResourcesSagas';
import { createSagaSlice } from 'src/shared/resources/utils/sagaSlice';
import type { ILayouts } from 'src/features/form/layout';
import type * as LayoutTypes from 'src/features/form/layout/formLayoutTypes';
import type { MkActionType } from 'src/shared/resources/utils/sagaSlice';
import type { ILayoutSets, IPagesSettings, IUiConfig } from 'src/types';

export interface ILayoutState {
  layouts: ILayouts | null;
  error: Error | null;
  uiConfig: IUiConfig;
  layoutsets: ILayoutSets | null;
}

export const initialState: ILayoutState = {
  layouts: null,
  error: null,
  uiConfig: {
    focus: null,
    hiddenFields: [],
    autoSave: null,
    repeatingGroups: null,
    fileUploadersWithTag: {},
    currentView: 'FormLayout',
    navigationConfig: {},
    tracks: {
      hidden: [],
      hiddenExpr: {},
      order: null,
    },
    pageTriggers: [],
    keepScrollPos: undefined,
  },
  layoutsets: null,
};
const formLayoutSlice = createSagaSlice((mkAction: MkActionType<ILayoutState>) => ({
  name: 'formLayout',
  initialState,
  extraSagas: [watchMapFileUploaderWithTagSaga, watchInitialCalculatePageOrderAndMoveToNextPageSaga],
  actions: {
    fetch: mkAction<void>({
      saga: () => watchFetchFormLayoutSaga,
    }),
    fetchFulfilled: mkAction<LayoutTypes.IFetchLayoutFulfilled>({
      reducer: (state, action) => {
        const { layouts, navigationConfig, hiddenLayoutsExpressions } = action.payload;
        state.layouts = layouts;
        state.uiConfig.navigationConfig = navigationConfig;
        state.uiConfig.tracks.order = Object.keys(layouts);
        state.uiConfig.tracks.hiddenExpr = hiddenLayoutsExpressions;
        state.error = null;
        state.uiConfig.repeatingGroups = null;
      },
      takeLatest: function* () {
        yield put(OptionsActions.fetch());
        yield put(DataListsActions.fetch());
      },
    }),
    fetchRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    fetchSets: mkAction<void>({
      takeLatest: fetchLayoutSetsSaga,
    }),
    fetchSetsFulfilled: mkAction<LayoutTypes.IFetchLayoutSetsFulfilled>({
      reducer: (state, action) => {
        const { layoutSets } = action.payload;
        if (!layoutSets) {
          return;
        }
        if (layoutSets.sets) {
          state.layoutsets = { sets: layoutSets.sets };
        }
        if (layoutSets.uiSettings) {
          updateCommonPageSettings(state, layoutSets.uiSettings);
        }
      },
    }),
    fetchSetsRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    fetchSettings: mkAction<void>({
      saga: () => watchFetchFormLayoutSettingsSaga,
    }),
    fetchSettingsFulfilled: mkAction<LayoutTypes.IFetchLayoutSettingsFulfilled>({
      reducer: (state, action) => {
        const { settings } = action.payload;
        if (settings && settings.pages) {
          updateCommonPageSettings(state, settings.pages);
          const order = settings.pages.order;
          if (order) {
            state.uiConfig.tracks.order = order;
            if (state.uiConfig.currentViewCacheKey) {
              let currentView: string;
              const lastVisitedPage = localStorage.getItem(state.uiConfig.currentViewCacheKey);
              if (lastVisitedPage && order.includes(lastVisitedPage)) {
                currentView = lastVisitedPage;
              } else {
                currentView = order[0];
              }
              state.uiConfig.currentView = currentView;
            } else {
              state.uiConfig.currentView = order[0];
            }
          }
        }
      },
    }),
    fetchSettingsRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    setCurrentViewCacheKey: mkAction<LayoutTypes.ISetCurrentViewCacheKey>({
      reducer: (state, action) => {
        const { key } = action.payload;
        state.uiConfig.currentViewCacheKey = key;
      },
    }),
    updateAutoSave: mkAction<LayoutTypes.IUpdateAutoSave>({
      reducer: (state, action) => {
        const { autoSave } = action.payload;
        state.uiConfig.autoSave = autoSave;
      },
    }),
    updateCurrentView: mkAction<LayoutTypes.IUpdateCurrentView>({
      saga: () => watchUpdateCurrentViewSaga,
    }),
    updateCurrentViewFulfilled: mkAction<LayoutTypes.IUpdateCurrentViewFulfilled>({
      reducer: (state, action) => {
        state.uiConfig.currentView = action.payload.newView;
        state.uiConfig.returnToView = action.payload.returnToView;
        state.uiConfig.keepScrollPos = undefined;
        state.uiConfig.focus = action.payload.focusComponentId;
      },
    }),
    updateCurrentViewRejected: mkAction<LayoutTypes.IUpdateCurrentViewRejected>({
      reducer: (state, action) => {
        state.error = action.payload.error;
        state.uiConfig.keepScrollPos = action.payload.keepScrollPos;
      },
    }),
    updateFocus: mkAction<LayoutTypes.IUpdateFocus>({
      reducer: (state, action) => {
        state.uiConfig.focus = action.payload.focusComponentId;
      },
    }),
    updateHiddenComponents: mkAction<LayoutTypes.IUpdateHiddenComponents>({
      reducer: (state, action) => {
        const { componentsToHide } = action.payload;
        state.uiConfig.hiddenFields = componentsToHide;
      },
    }),
    updateRepeatingGroups: mkAction<LayoutTypes.IUpdateRepeatingGroups>({
      takeLatest: updateRepeatingGroupsSaga,
      reducer: (state, action) => {
        const { layoutElementId, remove, index } = action.payload;
        if (remove && typeof index !== 'undefined') {
          state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
          state.uiConfig.repeatingGroups[layoutElementId].deletingIndex =
            state.uiConfig.repeatingGroups[layoutElementId].deletingIndex || [];
          state.uiConfig.repeatingGroups[layoutElementId].deletingIndex?.push(index);
        }
      },
    }),
    updateRepeatingGroupsFulfilled: mkAction<LayoutTypes.IUpdateRepeatingGroupsFulfilled>({
      takeLatest: replaceTextResourcesSaga,
      reducer: (state, action) => {
        const { repeatingGroups } = action.payload;
        state.uiConfig.repeatingGroups = repeatingGroups;
      },
    }),
    updateRepeatingGroupsRemoveCancelled: mkAction<LayoutTypes.IUpdateRepeatingGroupsRemoveCancelled>({
      reducer: (state, action) => {
        const { layoutElementId, index } = action.payload;
        state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
        state.uiConfig.repeatingGroups[layoutElementId].deletingIndex = (
          state.uiConfig.repeatingGroups[layoutElementId].deletingIndex || []
        ).filter((value) => value !== index);
      },
    }),
    updateRepeatingGroupsRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateRepeatingGroupsMultiPageIndex: mkAction<LayoutTypes.IUpdateRepeatingGroupsMultiPageIndex>({
      reducer: (state, action) => {
        const { group, index } = action.payload;
        if (state.uiConfig.repeatingGroups && state.uiConfig.repeatingGroups[group] && typeof index !== 'undefined') {
          state.uiConfig.repeatingGroups[group].multiPageIndex = index;
        }
      },
    }),
    updateRepeatingGroupsEditIndex: mkAction<LayoutTypes.IUpdateRepeatingGroupsEditIndex>({
      takeLatest: updateRepeatingGroupEditIndexSaga,
    }),
    updateRepeatingGroupsEditIndexFulfilled: mkAction<LayoutTypes.IUpdateRepeatingGroupsEditIndexFulfilled>({
      reducer: (state, action) => {
        const { group, index } = action.payload;
        state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
        state.uiConfig.repeatingGroups[group].editIndex = index;
      },
    }),
    updateRepeatingGroupsEditIndexRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateFileUploadersWithTagFulfilled: mkAction<LayoutTypes.IUpdateFileUploadersWithTagFulfilled>({
      reducer: (state, action) => {
        const { uploaders } = action.payload;
        state.uiConfig.fileUploadersWithTag = uploaders;
      },
    }),
    updateFileUploaderWithTagRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateFileUploaderWithTagEditIndex: mkAction<LayoutTypes.IUpdateFileUploaderWithTagEditIndex>({
      takeLatest: updateFileUploaderWithTagEditIndexSaga,
    }),
    updateFileUploaderWithTagEditIndexFulfilled: mkAction<LayoutTypes.IUpdateFileUploaderWithTagEditIndexFulfilled>({
      reducer: (state, action) => {
        const { componentId, index } = action.payload;
        state.uiConfig.fileUploadersWithTag = state.uiConfig.fileUploadersWithTag || {};
        const uploader = state.uiConfig.fileUploadersWithTag[componentId];
        if (uploader) {
          uploader.editIndex = index;
        }
      },
    }),
    updateFileUploaderWithTagEditIndexRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateFileUploaderWithTagChosenOptions: mkAction<LayoutTypes.IUpdateFileUploaderWithTagChosenOptions>({
      takeLatest: updateFileUploaderWithTagChosenOptionsSaga,
    }),
    updateFileUploaderWithTagChosenOptionsFulfilled:
      mkAction<LayoutTypes.IUpdateFileUploaderWithTagChosenOptionsFulfilled>({
        reducer: (state, action) => {
          const { componentId, id, option } = action.payload;
          state.uiConfig.fileUploadersWithTag = state.uiConfig.fileUploadersWithTag || {};
          const uploader = state.uiConfig.fileUploadersWithTag[componentId];
          if (uploader) {
            uploader.chosenOptions[id] = option.value;
          } else {
            state.uiConfig.fileUploadersWithTag[componentId] = {
              editIndex: -1,
              chosenOptions: { [id]: option.value },
            };
          }
        },
      }),
    updateFileUploaderWithTagChosenOptionsRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    calculatePageOrderAndMoveToNextPage: mkAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPage>({
      takeEvery: calculatePageOrderAndMoveToNextPageSaga,
    }),
    calculatePageOrderAndMoveToNextPageFulfilled: mkAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPageFulfilled>({
      reducer: (state, action) => {
        const { order } = action.payload;
        state.uiConfig.tracks.order = order;
      },
    }),
    calculatePageOrderAndMoveToNextPageRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    }),
    updateHiddenLayouts: mkAction<LayoutTypes.IHiddenLayoutsUpdate>({
      takeEvery: findAndMoveToNextVisibleLayout,
      reducer: (state, action) => {
        state.uiConfig.tracks.hidden = action.payload.hiddenLayouts;
      },
    }),
    initRepeatingGroups: mkAction<void>({
      saga: () => watchInitRepeatingGroupsSaga,
    }),
    clearKeepScrollPos: mkAction<void>({
      reducer: (state) => {
        state.uiConfig.keepScrollPos = undefined;
      },
    }),
  },
}));

const updateCommonPageSettings = (
  state: ILayoutState,
  page: Pick<IPagesSettings, 'hideCloseButton' | 'showLanguageSelector' | 'showProgress' | 'triggers'>,
) => {
  const {
    hideCloseButton = state.uiConfig.hideCloseButton,
    showLanguageSelector = state.uiConfig.showLanguageSelector,
    showProgress = state.uiConfig.showProgress,
    triggers = state.uiConfig.pageTriggers,
  } = page;

  state.uiConfig.hideCloseButton = hideCloseButton;
  state.uiConfig.showProgress = showProgress;
  state.uiConfig.showLanguageSelector = showLanguageSelector;
  state.uiConfig.pageTriggers = triggers;
};

export const FormLayoutActions = formLayoutSlice.actions;
export default formLayoutSlice;
