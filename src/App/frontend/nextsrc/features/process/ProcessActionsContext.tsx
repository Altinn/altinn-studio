import React, { createContext, useContext } from 'react';

export interface ProcessActions {
  submit: () => void;
  isSubmitting: boolean;
}

const ProcessActionsContext = createContext<ProcessActions | null>(null);

export const ProcessActionsProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ProcessActions;
}) => <ProcessActionsContext.Provider value={value}>{children}</ProcessActionsContext.Provider>;

export function useProcessActions(): ProcessActions | null {
  return useContext(ProcessActionsContext);
}
