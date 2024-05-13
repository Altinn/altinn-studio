import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export type BpmnApiContextProps = {
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSet: (data: { layoutSetIdToUpdate: string; newLayoutSetId: string }) => void;
  mutateDataType: (dataTypeId: DataTypeChange) => void;
  addDataTypeToAppMetadata: (data: { dataTypeId: string }) => void;
  deleteDataTypeFromAppMetadata: (data: { dataTypeId: string }) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
  openPolicyEditor: () => void;
};

export const BpmnApiContext = createContext<Partial<BpmnApiContextProps>>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
  availableDataModelIds: string[];
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetName: string | undefined;
  addLayoutSet: (data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig }) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSet: (data: { layoutSetIdToUpdate: string; newLayoutSetId: string }) => void;
  mutateDataType: (data: DataTypeChange) => void;
  addDataTypeToAppMetadata: (data: { dataTypeId: string }) => void;
  deleteDataTypeFromAppMetadata: (data: { dataTypeId: string }) => void;
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
  openPolicyEditor: () => void;
};
export const BpmnApiContextProvider = ({
  children,
  availableDataModelIds,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSet,
  mutateDataType,
  addDataTypeToAppMetadata,
  deleteDataTypeFromAppMetadata,
  saveBpmn,
  openPolicyEditor,
}: Partial<BpmnApiContextProviderProps>) => {
  return (
    <BpmnApiContext.Provider
      value={{
        availableDataModelIds,
        layoutSets,
        pendingApiOperations,
        existingCustomReceiptLayoutSetName,
        addLayoutSet,
        deleteLayoutSet,
        mutateLayoutSet,
        mutateDataType,
        addDataTypeToAppMetadata,
        deleteDataTypeFromAppMetadata,
        saveBpmn,
        openPolicyEditor,
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
