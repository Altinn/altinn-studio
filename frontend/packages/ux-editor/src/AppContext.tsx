import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutSetName } from './hooks';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
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
  const { org, app } = useStudioUrlParams();
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();

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

  const reloadPreview = useCallback(
    (layoutName: string) => {
      if (previewIframeRef?.current?.contentWindow) {
        previewIframeRef.current.contentWindow.window.location.href = `/app-specific-preview/${org}/${app}#/instance/51001/f1e23d45-6789-1bcd-8c34-56789abcdef0/Task_1/${layoutName}`;
      }
    },
    [app, org],
  );

  const value = useMemo(
    () => ({
      previewIframeRef,
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      reloadPreview,
    }),
    [refetchLayouts, refetchLayoutSettings, refetchTexts, reloadPreview],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
