import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useSelectedFormLayoutSetName } from 'app-shared/hooks/useSelectedFormLayoutSetName';
import { AppsQueryKey } from 'app-shared/types/AppsQueryKey';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (selectedFormLayoutSetName: string) => void;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (selectedFormLayoutName: string) => void;
  refetchAppLayouts: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  refetchAppLayoutSettings: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  refetchAppTexts: (language: string, resetQueries?: boolean) => Promise<void>;
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
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } =
    useSelectedFormLayoutSetName();
  const { selectedFormLayoutName, setSelectedFormLayoutName } =
    useSelectedFormLayoutName(selectedFormLayoutSetName);

  const refetch = useCallback(
    async (queryKey: QueryKey, resetQueries: boolean = false): Promise<void> => {
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

  const refetchAppLayouts = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppLayouts, layoutSetName], resetQueries);
    },
    [refetch],
  );

  const refetchAppLayoutSettings = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppLayoutSettings, layoutSetName], resetQueries);
    },
    [refetch],
  );

  const refetchAppTexts = useCallback(
    async (language: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppTextResources, language], resetQueries);
    },
    [refetch],
  );

  const value = useMemo(
    () => ({
      previewIframeRef,
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchAppLayouts,
      refetchAppLayoutSettings,
      refetchAppTexts,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    }),
    [
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      refetchAppLayouts,
      refetchAppLayoutSettings,
      refetchAppTexts,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
