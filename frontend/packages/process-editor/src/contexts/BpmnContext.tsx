import { supportsProcessEditor } from '../utils/processEditorUtils';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { MutableRefObject } from 'react';
import React, { createContext, useContext, useRef, useState } from 'react';
import type { BpmnDetails } from '../types/BpmnDetails';

export type BpmnContextProps = {
  bpmnXml: string;
  modelerRef?: MutableRefObject<Modeler>;
  numberOfUnsavedChanges: number;
  setNumberOfUnsavedChanges: React.Dispatch<React.SetStateAction<number>>;
  getUpdatedXml: () => Promise<string>;
  isEditAllowed: boolean;
  appLibVersion: string;
  bpmnDetails: BpmnDetails;
  setBpmnDetails: React.Dispatch<React.SetStateAction<BpmnDetails>>;
};

export const BpmnContext = createContext<BpmnContextProps>({
  bpmnXml: '',
  modelerRef: null,
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: () => {},
  getUpdatedXml: async () => '',
  isEditAllowed: true,
  appLibVersion: '',
  bpmnDetails: null,
  setBpmnDetails: () => {},
});

export type BpmnContextProviderProps = {
  children: React.ReactNode;
  bpmnXml: string | undefined | null;
  appLibVersion: string;
};
export const BpmnContextProvider = ({
  bpmnXml,
  children,
  appLibVersion,
}: BpmnContextProviderProps) => {
  const [numberOfUnsavedChanges, setNumberOfUnsavedChanges] = useState(0);
  const [bpmnDetails, setBpmnDetails] = useState<BpmnDetails>(null);

  const isEditAllowed =
    supportsProcessEditor(appLibVersion) || shouldDisplayFeature('shouldOverrideAppLibCheck');

  const modelerRef = useRef<Modeler | null>(null);

  const getUpdatedXml = async (): Promise<string> => {
    if (!modelerRef.current) {
      throw new Error('Modeler not initialized');
    }
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      setNumberOfUnsavedChanges(0);
      return xml;
    } catch {
      throw new Error('Failed to generate new xml');
    }
  };

  return (
    <BpmnContext.Provider
      value={{
        bpmnXml,
        modelerRef,
        numberOfUnsavedChanges,
        setNumberOfUnsavedChanges,
        getUpdatedXml,
        isEditAllowed,
        appLibVersion,
        bpmnDetails,
        setBpmnDetails,
      }}
    >
      {children}
    </BpmnContext.Provider>
  );
};

export const useBpmnContext = (): BpmnContextProps => {
  const context = useContext(BpmnContext);
  if (context === undefined) {
    throw new Error('useBpmnContext must be used within a BpmnContextProvider');
  }
  return context;
};
