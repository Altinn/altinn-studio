import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';
import type { MetaDataForm } from './BpmnConfigPanelContext';

export type BpmnApiContextProps = {
  layoutSets: LayoutSets;
  pendingLayoutSetOperations: boolean;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSet: (data: {
    layoutSetIdToUpdate: string;
    layoutSetConfig: LayoutSetConfig;
  }) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};

export const BpmnApiContext = createContext<BpmnApiContextProps>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
  layoutSets: LayoutSets;
  pendingLayoutSetOperations: boolean;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSet: (data: {
    layoutSetIdToUpdate: string;
    layoutSetConfig: LayoutSetConfig;
  }) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};
export const BpmnApiContextProvider = ({
  children,
  layoutSets,
  pendingLayoutSetOperations,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSet,
  saveBpmn,
}: BpmnApiContextProviderProps) => {
  return (
    <BpmnApiContext.Provider
      value={{
        layoutSets,
        pendingLayoutSetOperations,
        existingCustomReceiptLayoutSetName,
        addLayoutSet,
        deleteLayoutSet,
        mutateLayoutSet,
        saveBpmn,
      }}
    >
      {children}
    </BpmnApiContext.Provider>
  );
};

export const useBpmnApiContext = (): BpmnApiContextProps => {
  const context = useContext(BpmnApiContext);
  if (context === undefined) {
    throw new Error('useBpmnApiContext must be used within a BpmnApiContextProvider');
  }
  return context;
};
