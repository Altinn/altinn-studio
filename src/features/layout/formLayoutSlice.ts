import { takeEvery } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { removeHiddenValidationsSaga } from 'src/features/dynamics/conditionalRenderingSagas';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import {
  watchFetchFormLayoutSaga,
  watchFetchFormLayoutSettingsSaga,
} from 'src/features/layout/fetch/fetchFormLayoutSagas';
import { initRepeatingGroupsSaga } from 'src/features/layout/repGroups/initRepeatingGroupsSaga';
import { repGroupAddRowSaga } from 'src/features/layout/repGroups/repGroupAddRowSaga';
import { repGroupDeleteRowSaga } from 'src/features/layout/repGroups/repGroupDeleteRowSaga';
import { updateRepeatingGroupEditIndexSaga } from 'src/features/layout/repGroups/updateRepeatingGroupEditIndexSaga';
import {
  calculatePageOrderAndMoveToNextPageSaga,
  findAndMoveToNextVisibleLayout,
  updateCurrentViewSaga,
  watchInitialCalculatePageOrderAndMoveToNextPageSaga,
} from 'src/features/layout/update/updateFormLayoutSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type * as LayoutTypes from 'src/features/layout/formLayoutTypes';
import type { ILayouts } from 'src/layout/layout';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { ILayoutSets, IPagesSettings, IRepeatingGroups, IUiConfig } from 'src/types';

export interface ILayoutState {
  layouts: ILayouts | null;
  layoutSetId: string | null;
  error: Error | null;
  uiConfig: IUiConfig;
  layoutsets: ILayoutSets | null;
}

export const initialState: ILayoutState = {
  layouts: null,
  layoutSetId: null,
  error: null,
  uiConfig: {
    focus: null,
    hiddenFields: [],
    repeatingGroups: null,
    receiptLayoutName: undefined,
    currentView: 'FormLayout',
    navigationConfig: {},
    tracks: {
      hidden: [],
      hiddenExpr: {},
      order: null,
    },
    pageTriggers: [],
    keepScrollPos: undefined,
    expandedWidth: false,
    excludePageFromPdf: null,
    excludeComponentFromPdf: null,
    pdfLayoutName: undefined,
    autoSaveBehavior: 'onChangeFormData',
  },
  layoutsets: null,
};

export let FormLayoutActions: ActionsFromSlice<typeof formLayoutSlice>;
export const formLayoutSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<ILayoutState>) => {
    const genericReject = mkAction<LayoutTypes.IFormLayoutActionRejected>({
      reducer: (state, action) => {
        const { error } = action.payload;
        state.error = error;
      },
    });
    const genericSetRepeatingGroups = mkAction<{ updated: IRepeatingGroups }>({
      reducer: (state, { payload: { updated } }) => {
        state.uiConfig.repeatingGroups = updated;
      },
    });

    return {
      name: 'formLayout',
      initialState,
      extraSagas: [watchInitialCalculatePageOrderAndMoveToNextPageSaga],
      actions: {
        fetch: mkAction<void>({
          saga: () => watchFetchFormLayoutSaga,
        }),
        fetchFulfilled: mkAction<LayoutTypes.IFetchLayoutFulfilled>({
          reducer: (state, action) => {
            const { layouts, navigationConfig, hiddenLayoutsExpressions, layoutSetId } = action.payload;
            state.layouts = layouts;
            state.uiConfig.navigationConfig = navigationConfig;
            state.uiConfig.tracks.order = Object.keys(layouts);
            state.uiConfig.tracks.hiddenExpr = hiddenLayoutsExpressions;
            state.error = null;
            state.uiConfig.repeatingGroups = null;
            state.layoutSetId = layoutSetId;
          },
        }),
        fetchRejected: genericReject,
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
        fetchSetsRejected: genericReject,
        fetchSettings: mkAction<void>({
          saga: () => watchFetchFormLayoutSettingsSaga,
        }),
        fetchSettingsFulfilled: mkAction<LayoutTypes.IFetchLayoutSettingsFulfilled>({
          takeEvery: findAndMoveToNextVisibleLayout,
          reducer: (state, action) => {
            const { settings } = action.payload;
            state.uiConfig.receiptLayoutName = settings?.receiptLayoutName;
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
            state.uiConfig.showExpandWidthButton = settings?.pages.showExpandWidthButton;
            state.uiConfig.expandedWidth = settings?.pages.showExpandWidthButton ? state.uiConfig.expandedWidth : false;

            state.uiConfig.pdfLayoutName = settings?.pages.pdfLayoutName;
            state.uiConfig.excludeComponentFromPdf = settings?.components?.excludeFromPdf ?? [];
            state.uiConfig.excludePageFromPdf = settings?.pages?.excludeFromPdf ?? [];
          },
        }),
        fetchSettingsRejected: genericReject,
        setCurrentViewCacheKey: mkAction<LayoutTypes.ISetCurrentViewCacheKey>({
          reducer: (state, action) => {
            const { key } = action.payload;
            state.uiConfig.currentViewCacheKey = key;
          },
        }),
        updateCurrentView: mkAction<LayoutTypes.IUpdateCurrentView>({
          takeEvery: updateCurrentViewSaga,
        }),
        updateCurrentViewFulfilled: mkAction<LayoutTypes.IUpdateCurrentViewFulfilled>({
          takeEvery: (action) => {
            if (!action.payload.focusComponentId) {
              window.scrollTo({ top: 0 });
            }
          },
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
          takeEvery: removeHiddenValidationsSaga,
          reducer: (state, action) => {
            const { componentsToHide } = action.payload;
            state.uiConfig.hiddenFields = componentsToHide;
          },
        }),
        repGroupAddRow: mkAction<{ groupId: string }>({
          takeEvery: repGroupAddRowSaga,
        }),
        repGroupAddRowFulfilled: genericSetRepeatingGroups,
        repGroupAddRowRejected: genericReject,
        repGroupDeleteRow: mkAction<{ groupId: string; index: number }>({
          takeEvery: repGroupDeleteRowSaga,
          reducer: (state, { payload: { groupId, index } }) => {
            state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
            state.uiConfig.repeatingGroups[groupId].deletingIndex =
              state.uiConfig.repeatingGroups[groupId].deletingIndex || [];
            state.uiConfig.repeatingGroups[groupId].deletingIndex?.push(index);
          },
        }),
        repGroupDeleteRowFulfilled: genericSetRepeatingGroups,
        repGroupDeleteRowCancelled: mkAction<{ groupId: string; index: number }>({
          reducer: (state, { payload: { groupId, index } }) => {
            state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
            state.uiConfig.repeatingGroups[groupId].deletingIndex = (
              state.uiConfig.repeatingGroups[groupId].deletingIndex || []
            ).filter((value) => value !== index);
          },
        }),
        repGroupDeleteRowRejected: genericReject,
        repGroupSetMultiPage: mkAction<{ groupId: string; page: number }>({
          reducer: (state, { payload: { groupId, page } }) => {
            state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
            state.uiConfig.repeatingGroups[groupId].multiPageIndex = page;
          },
        }),
        updateRepeatingGroupsEditIndex: mkAction<LayoutTypes.IUpdateRepeatingGroupsEditIndex>({
          takeEvery: updateRepeatingGroupEditIndexSaga,
          reducer: (state, action) => {
            const { group } = action.payload;
            if (state.uiConfig.repeatingGroups && state.uiConfig.repeatingGroups[group]) {
              state.uiConfig.repeatingGroups[group].isLoading = true;
            }
          },
        }),
        updateRepeatingGroupsEditIndexFulfilled: mkAction<LayoutTypes.IUpdateRepeatingGroupsEditIndexFulfilled>({
          reducer: (state, action) => {
            const { group, index } = action.payload;
            state.uiConfig.repeatingGroups = state.uiConfig.repeatingGroups || {};
            state.uiConfig.repeatingGroups[group].editIndex = index;
            state.uiConfig.repeatingGroups[group].isLoading = false;
          },
        }),
        updateRepeatingGroupsEditIndexRejected: mkAction<LayoutTypes.IFormLayoutActionRejected>({
          reducer: (state, action) => {
            const { error, group } = action.payload;
            state.error = error;
            if (group && state.uiConfig.repeatingGroups && state.uiConfig.repeatingGroups[group]) {
              state.uiConfig.repeatingGroups[group].isLoading = false;
            }
          },
        }),
        calculatePageOrderAndMoveToNextPage: mkAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPage>({
          takeEvery: calculatePageOrderAndMoveToNextPageSaga,
        }),
        calculatePageOrderAndMoveToNextPageFulfilled:
          mkAction<LayoutTypes.ICalculatePageOrderAndMoveToNextPageFulfilled>({
            reducer: (state, action) => {
              const { order } = action.payload;
              state.uiConfig.tracks.order = order;
            },
          }),
        calculatePageOrderAndMoveToNextPageRejected: genericReject,
        updateHiddenLayouts: mkAction<LayoutTypes.IHiddenLayoutsUpdate>({
          takeEvery: findAndMoveToNextVisibleLayout,
          reducer: (state, action) => {
            state.uiConfig.tracks.hidden = action.payload.hiddenLayouts;
          },
        }),
        initRepeatingGroups: mkAction<LayoutTypes.IInitRepeatingGroups>({
          takeEvery: initRepeatingGroupsSaga,
          saga: () =>
            function* (): SagaIterator {
              yield takeEvery([FormDataActions.fetchFulfilled, FormLayoutActions.fetchFulfilled], () =>
                initRepeatingGroupsSaga({ payload: {} }),
              );
            },
        }),
        initRepeatingGroupsFulfilled: genericSetRepeatingGroups,
        clearKeepScrollPos: mkAction<void>({
          reducer: (state) => {
            state.uiConfig.keepScrollPos = undefined;
          },
        }),
        updateLayouts: mkAction<ILayouts>({
          reducer: (state, action) => {
            state.layouts = { ...state.layouts, ...action.payload };
          },
        }),
        toggleExpandedWidth: mkAction<void>({
          reducer: (state) => {
            state.uiConfig.expandedWidth = !state.uiConfig.expandedWidth;
          },
        }),
      },
    };
  });

  FormLayoutActions = slice.actions;
  return slice;
};

const updateCommonPageSettings = (
  state: ILayoutState,
  page: Pick<
    IPagesSettings,
    'hideCloseButton' | 'showLanguageSelector' | 'showProgress' | 'triggers' | 'autoSaveBehavior'
  >,
) => {
  const {
    hideCloseButton = state.uiConfig.hideCloseButton,
    showLanguageSelector = state.uiConfig.showLanguageSelector,
    autoSaveBehavior = state.uiConfig.autoSaveBehavior,
    showProgress = state.uiConfig.showProgress,
    triggers = state.uiConfig.pageTriggers,
  } = page;

  state.uiConfig.hideCloseButton = hideCloseButton;
  state.uiConfig.showLanguageSelector = showLanguageSelector;
  state.uiConfig.showProgress = showProgress;
  state.uiConfig.pageTriggers = triggers;
  state.uiConfig.autoSaveBehavior = autoSaveBehavior;
};
