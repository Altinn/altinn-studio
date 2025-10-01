import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

interface TaskOverridesContext {
  taskId?: string;
  dataModelType?: string;
  dataModelElementId?: string;
  layoutSetId?: string;
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
        layoutSetId: overrides.layoutSetId ?? parentContext.layoutSetId,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useTaskOverrides = () => useContext(Context);
