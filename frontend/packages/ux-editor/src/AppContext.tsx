import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback, useState } from 'react';
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
  reloadPreview: (layoutName: string) => void;
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedLayoutSet: string;
  setSelectedLayoutSet: (layoutSet: string) => void;
  removeSelectedLayoutSet: () => void;
  invalidLayouts: string[];
  setInvalidLayouts: (invalidLayouts: string[]) => void;
}

export const AppContext = createContext<AppContextProps>(null);

type AppContextProviderProps = {
  children: React.ReactNode;
};

export const AppContextProvider = ({ children }: AppContextProviderProps): React.JSX.Element => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { org, app } = useStudioUrlParams();
  const [selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet] =
    useReactiveLocalStorage('layoutSet/' + app, null);
  const [invalidLayouts, setInvalidLayouts] = useState<string[]>([]);

  const refetch = useCallback(async (queryKey: QueryKey): Promise<void> => {
    const contentWindow: WindowWithQueryClient = previewIframeRef?.current?.contentWindow;

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
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      reloadPreview,
      previewIframeRef,
      selectedLayoutSet,
      setSelectedLayoutSet,
      removeSelectedLayoutSet,
      invalidLayouts,
      setInvalidLayouts,
    }),
    [
      refetchLayouts,
      refetchLayoutSettings,
      refetchTexts,
      reloadPreview,
      removeSelectedLayoutSet,
      selectedLayoutSet,
      setSelectedLayoutSet,
      invalidLayouts,
      setInvalidLayouts,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
