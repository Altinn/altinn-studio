import React, { useState, createContext, useContext } from 'react';

export type MetaDataForm = {
  taskIdChanges?: {
    oldId: string;
    newId: string;
  };
};

type BpmnConfigPanelContextType = {
  metaDataForm: MetaDataForm;
  setMetaDataForm: React.Dispatch<React.SetStateAction<MetaDataForm>>;
  resetForm: () => void;
};

const BpmnConfigPanelFormContext = createContext<BpmnConfigPanelContextType>(undefined);

export type BpmnConfigPanelFormContextProviderProps = {
  children: React.ReactNode;
};

export const BpmnConfigPanelFormContextProvider = ({
  children,
}: BpmnConfigPanelFormContextProviderProps): React.ReactElement => {
  const [metaDataForm, setMetaDataForm] = useState<MetaDataForm>(undefined);

  const resetForm = (): void => {
    setMetaDataForm(undefined);
  };

  return (
    <BpmnConfigPanelFormContext.Provider value={{ metaDataForm, setMetaDataForm, resetForm }}>
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
