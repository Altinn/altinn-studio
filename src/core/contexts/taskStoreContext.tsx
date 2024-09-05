import React, { createContext, useContext } from 'react';

import { create } from 'zustand';

interface TaskState {
  overriddenTaskId?: string;
  overriddenDataModelType?: string;
  overriddenDataModelUuid?: string;
  overriddenLayoutSetId?: string;
  depth?: number;
  setOverriddenLayoutSetId?: (layoutSetId: string) => void;
  setOverriddenDataModelType?: (dataModelType: string) => void;
  setOverriddenDataModelUuid?: (dataModelUuid: string) => void;
  setTaskId?: (taskId: string) => void;
  setDepth?: (depth: number) => void;
  clearTaskId?: () => void;
}

export const createTaskStore = () =>
  create<TaskState>((set) => ({
    overriddenTaskId: undefined,
    overriddenDataModelType: undefined,
    overriddenDataModelUuid: undefined,
    overriddenLayoutSetId: undefined,
    depth: 1,
    setTaskId: (overriddenTaskId: string) => set({ overriddenTaskId }),
    setOverriddenLayoutSetId: (overriddenLayoutSetId: string) => set({ overriddenLayoutSetId }),
    setOverriddenDataModelType: (overriddenDataModelType: string) => set({ overriddenDataModelType }),
    setOverriddenDataModelUuid: (overriddenDataModelUuid: string) => set({ overriddenDataModelUuid }),
    clearTaskId: () => set({ overriddenTaskId: '' }),
    setDepth: (depth: number) => set({ depth }),
  }));

const StoreContext = createContext<ReturnType<typeof createTaskStore> | null>(null);

export function TaskStoreProvider({ children }: React.PropsWithChildren) {
  const store = createTaskStore();

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export const useTaskStore = <T,>(selector: (state: TaskState) => T): T => {
  const store = useContext(StoreContext);
  if (!store) {
    return {} as T;
  }
  return store(selector);
};
