import React, { createContext, useContext, useRef } from 'react';

export type MetaDataForm = {
  taskIdChanges?: Array<{
    oldId: string;
    newId: string;
  }>;
};

type BpmnConfigPanelContextType = {
  metaDataFormRef: React.MutableRefObject<MetaDataForm>;
  resetForm: () => void;
};

const BpmnConfigPanelFormContext = createContext<BpmnConfigPanelContextType>({
  metaDataFormRef: { current: undefined },
  resetForm: () => {},
});

export type BpmnConfigPanelFormContextProviderProps = {
  children: React.ReactNode;
};

export const BpmnConfigPanelFormContextProvider = ({
  children,
}: BpmnConfigPanelFormContextProviderProps): React.ReactElement => {
  const metaDataFormRef = useRef<MetaDataForm>(undefined);
  const resetForm = (): void => {
    metaDataFormRef.current = undefined;
  };

  return (
    <BpmnConfigPanelFormContext.Provider value={{ metaDataFormRef, resetForm }}>
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
