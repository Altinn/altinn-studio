import type { RefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  refetchLayouts: () => Promise<void>;
  refetchLayoutSettings: () => Promise<void>;
  refetchTexts: (language: string) => Promise<void>;
  previewIframeRef: RefObject<HTMLIFrameElement>;
  selectedLayoutSet: string;
  setSelectedLayoutSet: (layoutSet: string) => void;
  removeSelectedLayoutSet: () => void;
}

export const AppContext = createContext<AppContextProps>(null);

type AppContextProviderProps = {
  children: React.ReactNode;
};

export const AppContextProvider = ({ children }: AppContextProviderProps): React.JSX.Element => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { app } = useStudioUrlParams();
  const [selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet] =
    useReactiveLocalStorage('layoutSet/' + app, null);

  const refetch = useCallback(async (queryKey: QueryKey): Promise<void> => {
    const contentWindow: WindowWithQueryClient = previewIframeRef.current?.contentWindow;

    await contentWindow?.queryClient?.invalidateQueries({
      queryKey,
    });
  }, []);

  const refetchLayouts = useCallback(async (): Promise<void> => {
    return await refetch(['formLayouts', selectedLayoutSet]);
  }, [refetch, selectedLayoutSet]);

  const refetchLayoutSettings = useCallback(async (): Promise<void> => {
    return await refetch(['layoutSettings', selectedLayoutSet]);
  }, [refetch, selectedLayoutSet]);

  const refetchTexts = useCallback(
    async (language: string): Promise<void> => {
      return await refetch(['fetchTextResources', language]);
    },
    [refetch],
  );

  const value = useMemo(
    () => ({
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      previewIframeRef,
      selectedLayoutSet,
      setSelectedLayoutSet,
      removeSelectedLayoutSet,
    }),
    [
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      removeSelectedLayoutSet,
      selectedLayoutSet,
      setSelectedLayoutSet,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
