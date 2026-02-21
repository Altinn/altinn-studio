import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

interface TaskOverridesContext {
  taskId?: string;
  dataModelType?: string;
  dataModelElementId?: string;
  uiFolder?: string;
}

const Context = createContext<TaskOverridesContext>({});
Context.displayName = 'TaskOverridesContext';

type Props = PropsWithChildren & TaskOverridesContext;
export function TaskOverrides({ children, ...overrides }: Props) {
  const parentContext = useContext(Context);

  return (
    <Context.Provider
      value={{
        taskId: overrides.taskId ?? parentContext.taskId,
        dataModelType: overrides.dataModelType ?? parentContext.dataModelType,
        dataModelElementId: overrides.dataModelElementId ?? parentContext.dataModelElementId,
        uiFolder: overrides.uiFolder ?? parentContext.uiFolder,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useTaskOverrides = () => useContext(Context);
