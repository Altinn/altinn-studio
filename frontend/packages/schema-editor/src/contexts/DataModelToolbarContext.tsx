import React, { createContext, useContext, useState } from 'react';
import type { MetadataOption } from '../../../../app-development/types/MetadataOption';

type DataModelContextProps = {
  selectedTypePointer: string;
  setSelectedTypePointer: React.Dispatch<React.SetStateAction<string>>;
  selectedUniquePointer: string;
  setSelectedUniquePointer: React.Dispatch<React.SetStateAction<string>>;
  selectedOption: MetadataOption;
  setSelectedOption: React.Dispatch<React.SetStateAction<MetadataOption>>;
  modelPath: string | undefined;
  selectedModelName: string | undefined;
  selectedTypeName: string | undefined;
};

const DataModelContext = createContext<DataModelContextProps>(null);

export type DataModelToolbarContextProviderProps = {
  children: React.ReactNode;
};

export const DataModelContextProvider = ({ children }: DataModelToolbarContextProviderProps) => {
  const [selectedTypePointer, setSelectedTypePointer] = useState<string>(null);
  const [selectedUniquePointer, setSelectedUniquePointer] = useState<string>(null);
  const [selectedOption, setSelectedOption] = useState<MetadataOption>(null);

  const modelPath: string | undefined = selectedOption?.value?.repositoryRelativeUrl;
  const selectedModelName: string | undefined = selectedOption?.label ?? undefined;
  const selectedTypeName: string | undefined = getTypeName(selectedUniquePointer);

  const value = {
    selectedTypePointer,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
    selectedOption,
    setSelectedOption,
    modelPath,
    selectedModelName,
    selectedTypeName,
  };

  return <DataModelContext.Provider value={value}>{children}</DataModelContext.Provider>;
};

export const useDataModelContext = (): Partial<DataModelContextProps> => {
  const context = useContext(DataModelContext);
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
