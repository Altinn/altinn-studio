import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName, useSelectedFormLayoutSetName } from './hooks';
import { previewHash } from 'app-shared/api/paths';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (layoutSet: string) => void;
  removeSelectedFormLayoutSetName: () => void;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (layout: string) => void;
  refetchLayouts: () => Promise<void>;
  refetchLayoutSettings: () => Promise<void>;
  refetchTexts: (language: string) => Promise<void>;
  reloadPreview: (layoutName: string) => void;
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

  const refetchLayouts = useCallback(async (): Promise<void> => {
    return await refetch(['formLayouts', selectedFormLayoutSetName]);
  }, [refetch, selectedFormLayoutSetName]);

  const refetchLayoutSettings = useCallback(async (): Promise<void> => {
    return await refetch(['layoutSettings', selectedFormLayoutSetName]);
  }, [refetch, selectedFormLayoutSetName]);

  const refetchTexts = useCallback(
    async (language: string): Promise<void> => {
      return await refetch(['fetchTextResources', language]);
    },
    [refetch],
  );

  const reloadPreview = useCallback((layoutName: string) => {
    if (previewIframeRef?.current?.contentWindow) {
      previewIframeRef.current.contentWindow.window.location.hash = previewHash(layoutName);
    }
  }, []);

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
      reloadPreview,
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
      reloadPreview,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
