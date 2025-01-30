import React, { createContext, type MutableRefObject, useContext, useRef, useState } from 'react';
import { supportsProcessEditor } from '../utils/processEditorUtils';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
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
  isInitialized: boolean;
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  initialBpmnXml: string;
};

export const BpmnContext = createContext<Partial<BpmnContextProps>>(undefined);

export type BpmnContextProviderProps = {
  children: React.ReactNode;
  bpmnXml: string | undefined | null;
  appLibVersion: string;
};
export const BpmnContextProvider = ({
  bpmnXml,
  children,
  appLibVersion,
}: Partial<BpmnContextProviderProps>) => {
  const [bpmnDetails, setBpmnDetails] = useState<BpmnDetails>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initialBpmnXml] = useState<string>(bpmnXml);

  const isEditAllowed =
    supportsProcessEditor(appLibVersion) ||
    shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck);

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
        isInitialized,
        setIsInitialized,
        initialBpmnXml,
      }}
    >
      {children}
    </BpmnContext.Provider>
  );
};

export const useBpmnContext = (): Partial<BpmnContextProps> => {
  const context = useContext(BpmnContext);
  if (context === undefined) {
    throw new Error('useBpmnContext must be used within a BpmnContextProvider');
  }
  return context;
};
