import React, { createContext, useContext, useState } from 'react';

/**
 * This context holds global information about the layouts
 */
export type LayoutContextProps = {
  setSelectedLayoutSetName: React.Dispatch<React.SetStateAction<string>>;
  selectedLayoutSetName: string | undefined;
};

export const LayoutContext = createContext<Partial<LayoutContextProps>>(undefined);

export type LayoutContextProviderProps = {
  children: React.ReactNode;
};

export const LayoutContextProvider = ({ children }: Partial<LayoutContextProviderProps>) => {
  const [selectedLayoutSetName, setSelectedLayoutSetName] = useState<string | undefined>(undefined);

  return (
    <LayoutContext.Provider
      value={{
        selectedLayoutSetName,
        setSelectedLayoutSetName,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = (): Partial<LayoutContextProps> => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutContextProvider');
  }
  return context;
};
