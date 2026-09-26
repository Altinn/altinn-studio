import type { MutableRefObject } from 'react';
import React, { createContext, useContext, useRef, useState } from 'react';
import { supportsProcessEditor } from '../utils/processEditorUtils';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { BpmnDetails } from '../types/BpmnDetails';
import type { AppVersion } from 'app-shared/types/AppVersion';

export type BpmnContextProps = {
  bpmnXml: string;
  modelerRef?: MutableRefObject<Modeler>;
  getUpdatedXml: () => Promise<string>;
  isEditAllowed: boolean;
  appVersion: AppVersion;
  bpmnDetails: BpmnDetails;
  setBpmnDetails: React.Dispatch<React.SetStateAction<BpmnDetails>>;
  isInitialized: boolean;
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>;
  initialBpmnXml: string;
  /** True while the saved process is imported into the modeler, whose shape events are then not user edits. */
  isReloadingRef: MutableRefObject<boolean>;
  /** Counts the completed reloads of the saved process. A reload replaces every edit made before it. */
  reloadCountRef: MutableRefObject<number>;
  /** Runs a change to the saved process after the changes enqueued before it, and settles with it. */
  enqueueProcessChange: (change: () => Promise<void>) => Promise<void>;
};

export const BpmnContext = createContext<Partial<BpmnContextProps>>(undefined);

export type BpmnContextProviderProps = {
  children: React.ReactNode;
  bpmnXml: string | undefined | null;
  appVersion: AppVersion;
};
export const BpmnContextProvider = ({
  bpmnXml,
  children,
  appVersion,
}: Partial<BpmnContextProviderProps>) => {
  const [bpmnDetails, setBpmnDetails] = useState<BpmnDetails>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initialBpmnXml] = useState<string>(bpmnXml);

  const isEditAllowed =
    supportsProcessEditor(appVersion?.backendVersion ?? '') ||
    shouldDisplayFeature(FeatureFlag.ShouldOverrideAppLibCheck);

  const modelerRef = useRef<Modeler | null>(null);
  const isReloadingRef = useRef<boolean>(false);
  const reloadCountRef = useRef<number>(0);
  const lastProcessChangeRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueProcessChange = (change: () => Promise<void>): Promise<void> => {
    const processChange = lastProcessChangeRef.current.then(change);
    lastProcessChangeRef.current = processChange.catch(() => {});
    return processChange;
  };

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
        appVersion,
        bpmnDetails,
        setBpmnDetails,
        isInitialized,
        setIsInitialized,
        initialBpmnXml,
        isReloadingRef,
        reloadCountRef,
        enqueueProcessChange,
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
