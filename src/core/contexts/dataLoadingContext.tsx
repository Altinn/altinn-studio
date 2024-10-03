import React, { createContext, useContext } from 'react';

import { create } from 'zustand';

export enum DataLoadingState {
  Loading,
  Ready,
}

export interface DataLoading {
  dataElements: Record<string, DataLoadingState>;
  isDone: () => boolean;
  setDataElements: (dataElements: Record<string, DataLoadingState>) => void;
}

export const createDataLoadingStore = () =>
  create<DataLoading>((set, state) => ({
    dataElements: {},
    isDone() {
      return Object.values(state().dataElements).every((v) => v === DataLoadingState.Ready);
    },
    setDataElements: (newDataElements: Record<string, DataLoadingState>) => {
      set((state) => ({
        dataElements: {
          ...state.dataElements,
          ...newDataElements,
        },
      }));
    },
  }));

const StoreContext = createContext<ReturnType<typeof createDataLoadingStore> | null>(null);

export function DataLoadingProvider({ children }: React.PropsWithChildren) {
  const store = createDataLoadingStore();

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export const useDataLoadingStore = <T,>(selector: (state: DataLoading) => T) => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useDataLoadingStore must be used within a DataLoadingProvider');
  }

  return store(selector);
};
