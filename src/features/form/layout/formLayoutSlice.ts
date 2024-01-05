import { removeHiddenValidationsSaga } from 'src/features/form/dynamics/conditionalRenderingSagas';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type * as LayoutTypes from 'src/features/form/layout/formLayoutTypes';
import type { ILayoutSets, IPagesSettings } from 'src/layout/common.generated';
import type { ILayouts } from 'src/layout/layout';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';
import type { IUiConfig } from 'src/types';

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
  const slice = createSagaSlice((mkAction: MkActionType<ILayoutState>) => ({
    name: 'formLayout',
    initialState,
    actions: {
      fetchFulfilled: mkAction<LayoutTypes.IFetchLayoutFulfilled>({
        reducer: (state, action) => {
          const { layouts, hiddenLayoutsExpressions, layoutSetId } = action.payload;
          state.layouts = layouts;
          state.uiConfig.pageOrderConfig.order = Object.keys(layouts);
          state.uiConfig.pageOrderConfig.hiddenExpr = hiddenLayoutsExpressions;
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
      updateHiddenLayouts: mkAction<LayoutTypes.IHiddenLayoutsUpdate>({
        reducer: (state, action) => {
          state.uiConfig.pageOrderConfig.hidden = action.payload.hiddenLayouts;
        },
      }),
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
  }));

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
