import React, { createContext, useContext, useRef } from 'react';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';

type BpmnConfigPanelContextType = {
  metadataFormRef: React.MutableRefObject<MetadataForm>;
  resetForm: () => void;
};

const BpmnConfigPanelFormContext = createContext<BpmnConfigPanelContextType>(undefined);

export type BpmnConfigPanelFormContextProviderProps = {
  children: React.ReactNode;
};

export const BpmnConfigPanelFormContextProvider = ({
  children,
}: BpmnConfigPanelFormContextProviderProps): React.ReactElement => {
  const metadataFormRef = useRef<MetadataForm>(undefined);
  const resetForm = (): void => {
    metadataFormRef.current = undefined;
  };

  return (
    <BpmnConfigPanelFormContext.Provider value={{ metadataFormRef, resetForm }}>
      {children}
    </BpmnConfigPanelFormContext.Provider>
  );
};

export const useBpmnConfigPanelFormContext = (): BpmnConfigPanelContextType => {
  const context = useContext(BpmnConfigPanelFormContext);
  if (!context) {
    throw new Error(
      'useBpmnConfigPanelFormContext must be used within a BpmnConfigPanelContextProvider',
    );
  }
  return context;
};
