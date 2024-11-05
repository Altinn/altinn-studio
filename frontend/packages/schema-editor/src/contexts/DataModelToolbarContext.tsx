import React, { createContext, useContext, useState } from 'react';

type DataModelToolbarContextProps = {
  selectedTypePointer: string;
  setSelectedTypePointer: React.Dispatch<React.SetStateAction<string>>;
  selectedUniquePointer: string;
  setSelectedUniquePointer: React.Dispatch<React.SetStateAction<string>>;
};

const DataModelToolbarContext = createContext<DataModelToolbarContextProps>(null);

export type DataModelToolbarContextProviderProps = {
  children: React.ReactNode;
};

export const DataModelToolbarContextProvider = ({
  children,
}: DataModelToolbarContextProviderProps) => {
  const [selectedTypePointer, setSelectedTypePointer] = useState<string>(null);
  const [selectedUniquePointer, setSelectedUniquePointer] = useState<string>(null);

  const value = {
    selectedTypePointer,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
  };

  return (
    <DataModelToolbarContext.Provider value={value}>{children}</DataModelToolbarContext.Provider>
  );
};

export const useDataModelToolbarContext = (): Partial<DataModelToolbarContextProps> => {
  const context = useContext(DataModelToolbarContext);
  if (context === undefined) {
    throw new Error(
      'useDataModelToolbarContext must be used within a useDataModelToolbarContextProvider',
    );
  }
  return context;
};
