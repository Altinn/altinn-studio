import React, { createContext, useContext, useState } from 'react';

type TaskState = {
  overriddenTaskId?: string;
  overriddenDataModelType?: string;
  overriddenDataModelUuid?: string;
  overriddenLayoutSetId?: string;
  depth?: number;
};

type TaskActions = {
  setOverriddenLayoutSetId: (layoutSetId: string) => void;
  setOverriddenDataModelType: (dataModelType: string) => void;
  setOverriddenDataModelUuid: (dataModelUuid: string) => void;
  setTaskId: (taskId: string) => void;
  setDepth: (depth: number) => void;
  clearTaskId: () => void;
};

const TaskContext = createContext<(TaskState & TaskActions) | null>(null);

export function TaskStoreProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<TaskState>({
    overriddenTaskId: undefined,
    overriddenDataModelType: undefined,
    overriddenDataModelUuid: undefined,
    overriddenLayoutSetId: undefined,
    depth: 1,
  });

  const actions: TaskActions = {
    setTaskId: (overriddenTaskId: string) => setState((s) => ({ ...s, overriddenTaskId })),
    setOverriddenLayoutSetId: (overriddenLayoutSetId: string) => setState((s) => ({ ...s, overriddenLayoutSetId })),
    setOverriddenDataModelType: (overriddenDataModelType: string) =>
      setState((s) => ({ ...s, overriddenDataModelType })),
    setOverriddenDataModelUuid: (overriddenDataModelUuid: string) =>
      setState((s) => ({ ...s, overriddenDataModelUuid })),
    clearTaskId: () => setState((s) => ({ ...s, overriddenTaskId: '' })),
    setDepth: (depth: number) => setState((s) => ({ ...s, depth })),
  };

  return <TaskContext.Provider value={{ ...state, ...actions }}>{children}</TaskContext.Provider>;
}

export const useTaskStore = <T,>(selector: (state: TaskState & TaskActions) => T) => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskStore must be used within TaskStoreProvider');
  }
  return selector(context);
};
