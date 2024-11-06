import React, { createContext, useContext, useState } from 'react';
import type { MetadataOption } from '../../../../app-development/types/MetadataOption';

type DataModelToolbarContextProps = {
  selectedTypePointer: string;
  setSelectedTypePointer: React.Dispatch<React.SetStateAction<string>>;
  selectedUniquePointer: string;
  setSelectedUniquePointer: React.Dispatch<React.SetStateAction<string>>;
  selectedOption: MetadataOption;
  setSelectedOption: React.Dispatch<React.SetStateAction<MetadataOption>>;
  selectedModelName: string | undefined;
  selectedTypeName: string | undefined;
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
  const [selectedOption, setSelectedOption] = useState<MetadataOption>(null);

  const selectedModelName: string | undefined = selectedOption?.label ?? undefined;
  const selectedTypeName: string | undefined = getTypeName(selectedUniquePointer);

  const value = {
    selectedTypePointer,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
    selectedOption,
    setSelectedOption,
    selectedModelName,
    selectedTypeName,
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

const getTypeName = (selectedUniquePointer?: string | undefined): string | undefined => {
  if (selectedUniquePointer) {
    const indexOfLastDash = selectedUniquePointer.lastIndexOf('/');
    return selectedUniquePointer.substring(indexOfLastDash + 1);
  }
  return undefined;
};
