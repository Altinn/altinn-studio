import { createStore, useStore } from 'zustand';

import { DevToolsTab } from 'src/features/devtools/data/types';
import type {
  DevToolsHiddenComponents,
  IDevToolsActions,
  IDevToolsLog,
  IDevToolsState,
} from 'src/features/devtools/data/types';

type Store = IDevToolsState & { actions: IDevToolsActions };

export const DevToolsStore = createStore<Store>((set) => ({
  isOpen: false,
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
    baseId: undefined,
    nodeId: undefined,
  },
  logs: [],
  actions: {
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    setActiveTab: (tabName: DevToolsTab) =>
      set({
        activeTab: tabName,
        layoutInspector: { selectedComponentId: undefined },
        nodeInspector: { selectedNodeId: undefined },
      }),
    focusLayoutInspector: (componentId: string) =>
      set({ activeTab: DevToolsTab.Layout, layoutInspector: { selectedComponentId: componentId } }),
    focusNodeInspector: (nodeId: string) =>
      set({ activeTab: DevToolsTab.Components, nodeInspector: { selectedNodeId: nodeId } }),
    setPdfPreview: (preview: boolean) => set({ pdfPreview: preview }),
    setShowHiddenComponents: (value: DevToolsHiddenComponents) => set({ hiddenComponents: value }),
    exprPlaygroundSetExpression: (expression: string | undefined) =>
      set((state) => ({ exprPlayground: { ...state.exprPlayground, expression } })),
    exprPlaygroundSetContext: (nodeId: string | undefined) =>
      set((state) => ({ exprPlayground: { ...state.exprPlayground, nodeId } })),
    layoutInspectorSet: (selectedComponentId: string | undefined) => set({ layoutInspector: { selectedComponentId } }),
    nodeInspectorSet: (selectedNodeId: string | undefined) => set({ nodeInspector: { selectedNodeId } }),
    postLogs: (newLogs: IDevToolsLog[]) => set(({ logs }) => ({ logs: [...logs, ...newLogs] })),
    logsClear: () => set({ logs: [] }),
  },
}));

export const useDevToolsStore = <T>(selector: (state: Store) => T) => useStore(DevToolsStore, selector);
