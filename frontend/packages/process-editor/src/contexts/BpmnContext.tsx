import React, { createContext, useContext, useRef, useState, type MutableRefObject } from 'react';
import { supportsProcessEditor } from '../utils/processEditorUtils';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { BpmnDetails } from '../types/BpmnDetails';

export type BpmnContextProps = {
  bpmnXml: string;
  modelerRef?: MutableRefObject<Modeler>;
  getUpdatedXml: () => Promise<string>;
  isEditAllowed: boolean;
  appLibVersion: string;
  bpmnDetails: BpmnDetails;
  setBpmnDetails: React.Dispatch<React.SetStateAction<BpmnDetails>>;
};

export const BpmnContext = createContext<BpmnContextProps>({
  bpmnXml: '',
  modelerRef: null,
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
