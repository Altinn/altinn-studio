import React, { createContext, useContext } from 'react';

import { create } from 'zustand';

import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface TaskState {
  overriddenTaskId?: string;
  overriddenDataModelType?: string;
  overriddenLayoutSetId?: string;
  setOverriddenLayoutSetId?: (layoutSetId: string) => void;
  setOverriddenDataModelId?: (taskId: string) => void;
  setTaskId?: (taskId: string) => void;
  setDepth?: (depth: number) => void;
  clearTaskId?: () => void;
  depth?: number;
  summaryNode: LayoutNode<'Summary2'>;
  summaryItem: CompSummary2External;
}

export const createSummaryStore = (summaryNode: LayoutNode<'Summary2'>, summaryItem) =>
  create<TaskState>((set) => ({
    overriddenTaskId: '',
    overriddenDataModelType: '',
    overriddenLayoutSetId: '',
    depth: 1,
    setTaskId: (overriddenTaskId: string) => set({ overriddenTaskId }),
    setOverriddenLayoutSetId: (overriddenLayoutSetId: string) => set({ overriddenLayoutSetId }),
    setOverriddenDataModelId: (overriddenDataModelType: string) => set({ overriddenDataModelType }),
    clearTaskId: () => set({ overriddenTaskId: '' }),
    setDepth: (depth: number) => set({ depth }),
    summaryNode,
    summaryItem,
  }));

const StoreContext = createContext<ReturnType<typeof createSummaryStore> | null>(null);

interface Summary2StoreProviderProps extends React.PropsWithChildren {
  summaryNode: LayoutNode<'Summary2'>;
  summaryItem: CompSummary2External;
}

export function Summary2StoreProvider({ children, summaryNode, summaryItem }: Summary2StoreProviderProps) {
  const store = createSummaryStore(summaryNode, summaryItem);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export const useTaskStore = <T,>(selector: (state: TaskState) => T): T => {
  const store = useContext(StoreContext);
  if (!store) {
    return {} as T;
  }
  return store(selector);
};
