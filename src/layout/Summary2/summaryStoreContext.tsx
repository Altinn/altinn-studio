import React, { createContext, useContext } from 'react';

import { create } from 'zustand';

import type { CompSummary2External } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface SummaryTaskState {
  summaryNode: LayoutNode<'Summary2'>;
  summaryItem: CompSummary2External;
}

type Summary2StoreProviderProps = React.PropsWithChildren & SummaryTaskState;

const createSummary2Store = (summaryNode: LayoutNode<'Summary2'>, summaryItem: CompSummary2External) =>
  create<SummaryTaskState>((set) => ({
    summaryNode,
    summaryItem,
    setSummaryNode: (summaryNode: LayoutNode<'Summary2'>) => set((state) => ({ ...state, summaryNode })),
    setSummaryItem: (summaryItem: CompSummary2External) => set((state) => ({ ...state, summaryItem })),
  }));

const StoreContext = createContext<ReturnType<typeof createSummary2Store> | null>(null);

export function Summary2StoreProvider({ children, summaryNode, summaryItem }: Summary2StoreProviderProps) {
  const store = createSummary2Store(summaryNode, summaryItem);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export const useSummary2Store = <T,>(selector: (state: SummaryTaskState) => T): T => {
  const store = useContext(StoreContext);
  if (!store) {
    return {} as T;
  }
  return store(selector);
};
