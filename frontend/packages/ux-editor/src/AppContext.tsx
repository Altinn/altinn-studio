import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName, useSelectedFormLayoutSetName } from './hooks';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (selectedFormLayoutSetName: string) => void;
  removeSelectedFormLayoutSetName: () => void;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (selectedFormLayoutName: string) => void;
  refetchLayouts: (layoutSetName: string) => Promise<void>;
  refetchLayoutSettings: (layoutSetName: string) => Promise<void>;
  refetchTexts: (language: string) => Promise<void>;
}

export const AppContext = createContext<AppContextProps>(null);

type AppContextProviderProps = {
  children: React.ReactNode;
};

export const AppContextProvider = ({ children }: AppContextProviderProps): React.JSX.Element => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    removeSelectedFormLayoutSetName,
  } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName, setSelectedFormLayoutName } =
    useSelectedFormLayoutName(selectedFormLayoutSetName);

  const refetch = useCallback(async (queryKey: QueryKey): Promise<void> => {
    const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;

    await contentWindow?.queryClient?.invalidateQueries({
      queryKey,
    });
  }, []);

  const refetchLayouts = useCallback(
    async (layoutSetName: string): Promise<void> => {
      return await refetch(['formLayouts', layoutSetName]);
    },
    [refetch],
  );

  const refetchLayoutSettings = useCallback(
    async (layoutSetName: string): Promise<void> => {
      return await refetch(['layoutSettings', layoutSetName]);
    },
    [refetch],
  );

  const refetchTexts = useCallback(
    async (language: string): Promise<void> => {
      return await refetch(['fetchTextResources', language]);
    },
    [refetch],
  );

  const value = useMemo(
    () => ({
      previewIframeRef,
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      removeSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
    }),
    [
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      removeSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
