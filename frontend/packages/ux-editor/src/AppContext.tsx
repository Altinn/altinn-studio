import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback } from 'react';
import type { QueryClient, QueryKey as TanStackQueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName, useSelectedFormLayoutSetName } from './hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { QueryKey } from 'app-shared/types/QueryKey';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (selectedFormLayoutSetName: string) => void;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (selectedFormLayoutName: string) => void;
  refetchLayouts: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  refetchLayoutSettings: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  refetchTexts: (language: string, resetQueries?: boolean) => Promise<void>;
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
}

export const AppContext = createContext<AppContextProps>(null);

type AppContextProviderProps = {
  children: React.ReactNode;
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
};

export const AppContextProvider = ({
  children,
  shouldReloadPreview,
  previewHasLoaded,
  onLayoutSetNameChange,
}: AppContextProviderProps): React.JSX.Element => {
  const { org, app } = useStudioEnvironmentParams();
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } =
    useSelectedFormLayoutSetName();
  const { selectedFormLayoutName, setSelectedFormLayoutName } =
    useSelectedFormLayoutName(selectedFormLayoutSetName);

  const refetch = useCallback(
    async (queryKey: TanStackQueryKey, resetQueries: boolean = false): Promise<void> => {
      const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;

      resetQueries
        ? await contentWindow?.queryClient?.resetQueries({
            queryKey,
          })
        : await contentWindow?.queryClient?.invalidateQueries({
            queryKey,
          });
    },
    [],
  );

  const refetchLayouts = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([QueryKey.FormLayouts, org, app, layoutSetName], resetQueries);
    },
    [refetch, org, app],
  );

  const refetchLayoutSettings = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([QueryKey.FormLayoutSettings, org, app, layoutSetName], resetQueries);
    },
    [refetch, org, app],
  );

  const refetchTexts = useCallback(
    async (language: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([QueryKey.FetchTextResources, org, app, language], resetQueries);
    },
    [refetch, org, app],
  );

  const value = useMemo(
    () => ({
      previewIframeRef,
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    }),
    [
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
