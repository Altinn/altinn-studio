import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export type BpmnApiContextProps = {
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSet: (data: { layoutSetIdToUpdate: string; newLayoutSetId: string }) => void;
  mutateDataType: (dataTypeChange: DataTypeChange) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};

export const BpmnApiContext = createContext<Partial<BpmnApiContextProps>>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  // Todo - rename below
  mutateLayoutSet: (data: { layoutSetIdToUpdate: string; newLayoutSetId: string }) => void;
  mutateDataType: (data: DataTypeChange) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};
export const BpmnApiContextProvider = ({
  children,
  availableDataModelIds,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetId,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSet,
  mutateDataType,
  saveBpmn,
}: Partial<BpmnApiContextProviderProps>) => {
  return (
    <BpmnApiContext.Provider
      value={{
        availableDataModelIds,
        layoutSets,
        pendingApiOperations,
        existingCustomReceiptLayoutSetId,
        addLayoutSet,
        deleteLayoutSet,
        mutateLayoutSet,
        mutateDataType,
        saveBpmn,
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
