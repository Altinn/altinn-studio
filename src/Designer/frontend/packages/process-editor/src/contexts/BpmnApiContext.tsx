import type { LayoutSets, LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import React, { createContext, useContext } from 'react';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';
import type { DataTypesChange } from 'app-shared/types/api/DataTypesChange';
import type { BpmnTaskType } from 'app-shared/types/BpmnTaskType';

type QueryOptions = {
  onSuccess: () => void;
};

export type SaveBpmnOptions = {
  addsOrRemovesTasks?: boolean;
};

export type BpmnApiContextProps = {
  availableDataTypeIds: string[];
  availableDataModelIds: string[];
  allDataModelIds: string[];
  layoutSets: LayoutSets;
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: string | undefined;
  addLayoutSet: (
    data: {
      taskType?: BpmnTaskType;
      layoutSetConfig: LayoutSetConfig;
    },
    options?: QueryOptions,
  ) => void;
  deleteLayoutSet: (data: { layoutSetIdToUpdate: string }) => void;
  mutateLayoutSetId: (
    data: { layoutSetIdToUpdate: string; newLayoutSetId: string },
    options?: QueryOptions,
  ) => void;
  mutateDataTypes: (dataTypesChange: DataTypesChange, options?: QueryOptions) => void;
  saveBpmn: (bpmnXml: Promise<string>, metadata?: MetadataForm, options?: SaveBpmnOptions) => void;
  saveSubformPdfComponent: (change: NonNullable<MetadataForm['subformPdfComponentChange']>) => void;
};

export const BpmnApiContext = createContext<Partial<BpmnApiContextProps>>(undefined);

export type BpmnApiContextProviderProps = {
  children: React.ReactNode;
} & BpmnApiContextProps;

export const BpmnApiContextProvider = ({
  children,
  ...rest
}: Partial<BpmnApiContextProviderProps>) => {
  return (
    <BpmnApiContext.Provider
      value={{
        ...rest,
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
