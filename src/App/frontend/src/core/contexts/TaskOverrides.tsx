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
  const dataModelType = overrides.dataModelType ?? parentContext.dataModelType;

  // A data element id names an element of one data type, so it is only inherited while the data type stays the same.
  const inheritedDataModelElementId =
    dataModelType === parentContext.dataModelType ? parentContext.dataModelElementId : undefined;

  return (
    <Context.Provider
      value={{
        taskId: overrides.taskId ?? parentContext.taskId,
        dataModelType,
        dataModelElementId: overrides.dataModelElementId ?? inheritedDataModelElementId,
        uiFolder: overrides.uiFolder ?? parentContext.uiFolder,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useTaskOverrides = () => useContext(Context);
