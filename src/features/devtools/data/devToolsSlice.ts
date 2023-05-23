import { previewPdfSaga } from 'src/features/devtools/data/devToolsSagas';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { createSagaSlice } from 'src/redux/sagaSlice';
import type { IDevToolsState } from 'src/features/devtools/data/types';
import type { ActionsFromSlice, MkActionType } from 'src/redux/sagaSlice';

export const initialState: IDevToolsState = {
  isOpen: false,
  hasBeenOpen: false,
  pdfPreview: false,
  hiddenComponents: 'hide',
  activeTab: DevToolsTab.General,
  layoutInspector: {
    selectedComponentId: undefined,
  },
  nodeInspector: {
    selectedNodeId: undefined,
  },
  exprPlayground: {
    expression: undefined,
    forPage: undefined,
    forComponentId: undefined,
  },
};

export let DevToolsActions: ActionsFromSlice<typeof devToolsSlice>;
export const devToolsSlice = () => {
  const slice = createSagaSlice((mkAction: MkActionType<IDevToolsState>) => ({
    name: 'devTools',
    initialState,
    actions: {
      open: mkAction<void>({
        reducer: (state) => {
          state.isOpen = true;
          state.hasBeenOpen = true;
        },
      }),
      close: mkAction<void>({
        reducer: (state) => {
          state.isOpen = false;
        },
      }),
      setActiveTab: mkAction<{ tabName: IDevToolsState['activeTab'] }>({
        reducer: (state, action) => {
          state.activeTab = action.payload.tabName;
        },
      }),
      previewPdf: mkAction<void>({
        takeEvery: previewPdfSaga,
      }),
      setPdfPreview: mkAction<{ preview: boolean }>({
        reducer: (state, action) => {
          const { preview } = action.payload;
          state.pdfPreview = preview;
        },
      }),
      setShowHiddenComponents: mkAction<{ value: IDevToolsState['hiddenComponents'] }>({
        reducer: (state, action) => {
          state.hiddenComponents = action.payload.value;
        },
      }),
      exprPlaygroundSetExpression: mkAction<{ expression: string | undefined }>({
        reducer: (state, action) => {
          state.exprPlayground.expression = action.payload.expression;
        },
      }),
      exprPlaygroundSetContext: mkAction<{ forPage: string | undefined; forComponentId: string | undefined }>({
        reducer: (state, action) => {
          state.exprPlayground.forPage = action.payload.forPage;
          state.exprPlayground.forComponentId = action.payload.forComponentId;
        },
      }),
      layoutInspectorSet: mkAction<{ selectedComponentId: string | undefined }>({
        reducer: (state, action) => {
          state.layoutInspector.selectedComponentId = action.payload.selectedComponentId;
        },
      }),
      nodeInspectorSet: mkAction<{ selectedNodeId: string | undefined }>({
        reducer: (state, action) => {
          state.nodeInspector.selectedNodeId = action.payload.selectedNodeId;
        },
      }),
    },
  }));
  DevToolsActions = slice.actions;
  return slice;
};
