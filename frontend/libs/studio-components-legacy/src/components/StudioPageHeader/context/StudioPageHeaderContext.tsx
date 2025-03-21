import React, { type ReactNode, createContext, useContext } from 'react';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

export type StudioPageHeaderContextProps = {
  variant: StudioPageHeaderVariant;
};

export const StudioPageHeaderContext =
  createContext<Partial<StudioPageHeaderContextProps>>(undefined);

export type StudioPageHeaderContextProviderProps = {
  children: ReactNode;
} & StudioPageHeaderContextProps;

export const StudioPageHeaderContextProvider = ({
  children,
  variant,
}: Partial<StudioPageHeaderContextProviderProps>) => {
  return (
    <StudioPageHeaderContext.Provider
      value={{
        variant,
      }}
    >
      {children}
    </StudioPageHeaderContext.Provider>
  );
};

export const useStudioPageHeaderContext = (): Partial<StudioPageHeaderContextProps> => {
  const context = useContext(StudioPageHeaderContext);
  if (context === undefined) {
    throw new Error(
      'useStudioPageHeaderContext must be used within a StudioPageHeaderContextProvider',
    );
  }
  return context;
};
