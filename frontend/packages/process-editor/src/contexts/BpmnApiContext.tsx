import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';

export type BpmnApiContextProps = {
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  mutateLayoutSet: (data: {
    layoutSetIdToUpdate: string;
    layoutSetConfig: LayoutSetConfig;
  }) => void;
};

export const BpmnApiContext = createContext<Partial<BpmnApiContextProps>>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  mutateLayoutSet: (data: {
    layoutSetIdToUpdate: string;
    layoutSetConfig: LayoutSetConfig;
  }) => void;
};
export const BpmnApiContextProvider = ({
  children,
  availableDataModelIds,
  layoutSets,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  mutateLayoutSet,
}: BpmnApiContextProviderProps) => {
  return (
    <BpmnApiContext.Provider
      value={{
        availableDataModelIds,
        layoutSets,
        existingCustomReceiptLayoutSetName,
        addLayoutSet,
        mutateLayoutSet,
      }}
    >
      {children}
    </BpmnApiContext.Provider>
  );
};

export const useBpmnApiContext = (): Partial<BpmnApiContextProps> => {
  const context = useContext(BpmnApiContext);
  if (context === undefined) {
    throw new Error('useBpmnApiContext must be used within a BpmnApiContextProvider');
  }
  return context;
};
