import React, { createContext, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';

type StudioDropdownContextProps = {
  setOpen: (open: boolean) => void;
};

export const StudioDropdownContext = createContext<StudioDropdownContextProps | undefined>(
  undefined,
);

type StudioDropdownContextProviderProps = {
  children: ReactNode;
} & StudioDropdownContextProps;

export const StudioDropdownContextProvider = ({
  children,
  setOpen,
}: StudioDropdownContextProviderProps): ReactElement => {
  return (
    <StudioDropdownContext.Provider value={{ setOpen }}>{children}</StudioDropdownContext.Provider>
  );
};

export const useStudioDropdownContext = (): Partial<StudioDropdownContextProps> => {
  const context = useContext(StudioDropdownContext);
  console.log('context', context);
  if (context === undefined) {
    console.log('context is undefined');
    throw new Error('useStudioDropdownContext must be used within a StudioDropdownContextProvider');
  }
  return context;
};
