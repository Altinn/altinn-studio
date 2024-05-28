import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';
import type { DataTypeChange } from 'app-shared/types/api/DataTypeChange';
import { Policy } from 'app-shared/types/Policy';

type QueryOptions = {
  onSuccess: () => void;
};

export type BpmnApiContextProps = {
  availableDataModelIds: string[];
  currentPolicy: Policy;
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: string | undefined;
  addLayoutSet: (
    data: { layoutSetIdToUpdate: string; layoutSetConfig: LayoutSetConfig },
    options?: QueryOptions,
  ) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateApplicationPolicy: (policy: Policy, options?: QueryOptions) => void;
  mutateLayoutSetId: (data: { layoutSetIdToUpdate: string; newLayoutSetId: string }) => void;
  mutateDataType: (dataTypeChange: DataTypeChange, options?: QueryOptions) => void;
  addDataTypeToAppMetadata: (data: { dataTypeId: string }) => void;
  deleteDataTypeFromAppMetadata: (data: { dataTypeId: string }) => void;

  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
  openPolicyEditor: () => void;
};

export const BpmnApiContext = createContext<Partial<BpmnApiContextProps>>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
} & BpmnApiContextProps;

export const BpmnApiContextProvider = ({
  children,
  availableDataModelIds,
  currentPolicy,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetId,
  addLayoutSet,
  deleteLayoutSet,
  mutateApplicationPolicy,
  mutateLayoutSetId,
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
        currentPolicy,
        layoutSets,
        pendingApiOperations,
        existingCustomReceiptLayoutSetId,
        addLayoutSet,
        mutateApplicationPolicy,
        deleteLayoutSet,
        mutateLayoutSetId,
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
