import type { MutableRefObject } from 'react';
import React, { createContext, useContext, useRef, useState } from 'react';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { BpmnDetails } from '../types/BpmnDetails';

export type BpmnContextProps = {
  bpmnXml: string;
  modelerRef?: MutableRefObject<Modeler>;
  getUpdatedXml: () => Promise<string>;
  bpmnDetails: BpmnDetails;
  setBpmnDetails: React.Dispatch<React.SetStateAction<BpmnDetails>>;
  isInitialized: boolean;
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  initialBpmnXml: string;
  /** True while the saved process is imported into the modeler, whose shape events are then not user edits. */
  isReloadingRef: MutableRefObject<boolean>;
};

export const BpmnContext = createContext<Partial<BpmnContextProps>>(undefined);

export type BpmnContextProviderProps = {
  children: React.ReactNode;
  bpmnXml: string | undefined | null;
};
export const BpmnContextProvider = ({
  bpmnXml,
  children,
}: Partial<BpmnContextProviderProps>) => {
  const [bpmnDetails, setBpmnDetails] = useState<BpmnDetails>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initialBpmnXml] = useState<string>(bpmnXml);

  const modelerRef = useRef<Modeler | null>(null);
  const isReloadingRef = useRef<boolean>(false);

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
        bpmnDetails,
        setBpmnDetails,
        isInitialized,
        setIsInitialized,
        initialBpmnXml,
        isReloadingRef,
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
