import { takeEvery } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { removeHiddenValidationsSaga } from 'src/features/form/dynamics/conditionalRenderingSagas';
import { initRepeatingGroupsSaga } from 'src/features/form/layout/repGroups/initRepeatingGroupsSaga';
import { repGroupAddRowSaga } from 'src/features/form/layout/repGroups/repGroupAddRowSaga';
import { repGroupDeleteRowSaga } from 'src/features/form/layout/repGroups/repGroupDeleteRowSaga';
import { updateRepeatingGroupEditIndexSaga } from 'src/features/form/layout/repGroups/updateRepeatingGroupEditIndexSaga';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type * as LayoutTypes from 'src/features/form/layout/formLayoutTypes';
import type { ILayouts } from 'src/layout/layout';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { ILayoutSets, IPagesSettings, IRepeatingGroups, IUiConfig } from 'src/types';

export interface ILayoutState {
  layouts: ILayouts | null;
  layoutSetId: string | null;
  uiConfig: IUiConfig;
  layoutsets: ILayoutSets | null;
}

export const initialState: ILayoutState = {
  layouts: null,
  layoutSetId: null,
  uiConfig: {
    focus: null,
    hiddenFields: [],
    repeatingGroups: null,
    receiptLayoutName: undefined,
    currentView: 'FormLayout',
    pageOrderConfig: {
      hidden: [],
      hiddenExpr: {},
      order: null,
    },
    pageTriggers: [],
    keepScrollPos: undefined,
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
    const genericSetRepeatingGroups = mkAction<{ updated: IRepeatingGroups }>({
      reducer: (state, { payload: { updated } }) => {
        state.uiConfig.repeatingGroups = updated;
      },
    });

    return {
      name: 'formLayout',
      initialState,
      actions: {
        fetchFulfilled: mkAction<LayoutTypes.IFetchLayoutFulfilled>({
          reducer: (state, action) => {
            const { layouts, hiddenLayoutsExpressions, layoutSetId } = action.payload;
            state.layouts = layouts;
            state.uiConfig.pageOrderConfig.order = Object.keys(layouts);
            state.uiConfig.pageOrderConfig.hiddenExpr = hiddenLayoutsExpressions;
            state.uiConfig.repeatingGroups = null;
            state.layoutSetId = layoutSetId;
          },
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
        fetchSettingsFulfilled: mkAction<LayoutTypes.IFetchLayoutSettingsFulfilled>({
          reducer: (state, action) => {
            const { settings } = action.payload;
            state.uiConfig.receiptLayoutName = settings?.receiptLayoutName;
            if (settings && settings.pages) {
              updateCommonPageSettings(state, settings.pages);
              const order = settings.pages.order;
              if (order) {
                state.uiConfig.pageOrderConfig.order = order;
              }
            }

            state.uiConfig.pdfLayoutName = settings?.pages.pdfLayoutName;
            state.uiConfig.excludeComponentFromPdf = settings?.components?.excludeFromPdf ?? [];
            state.uiConfig.excludePageFromPdf = settings?.pages?.excludeFromPdf ?? [];
          },
        }),
        updateHiddenComponents: mkAction<LayoutTypes.IUpdateHiddenComponents>({
          takeEvery: removeHiddenValidationsSaga,
          reducer: (state, action) => {
            const { componentsToHide } = action.payload;
            state.uiConfig.hiddenFields = componentsToHide;
          },
        }),
        repGroupAddRow: mkAction<LayoutTypes.IRepGroupAddRow>({
          takeEvery: repGroupAddRowSaga,
        }),
        repGroupAddRowFulfilled: genericSetRepeatingGroups,
        repGroupDeleteRow: mkAction<LayoutTypes.IRepGroupDelRow>({
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
            const { group } = action.payload;
            if (group && state.uiConfig.repeatingGroups && state.uiConfig.repeatingGroups[group]) {
              state.uiConfig.repeatingGroups[group].isLoading = false;
            }
          },
        }),
        updateHiddenLayouts: mkAction<LayoutTypes.IHiddenLayoutsUpdate>({
          reducer: (state, action) => {
            state.uiConfig.pageOrderConfig.hidden = action.payload.hiddenLayouts;
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
  const { autoSaveBehavior = state.uiConfig.autoSaveBehavior, triggers = state.uiConfig.pageTriggers } = page;

  state.uiConfig.pageTriggers = triggers;
  state.uiConfig.autoSaveBehavior = autoSaveBehavior;
};
