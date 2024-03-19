import type { MutableRefObject } from 'react';
import React, { useMemo, useRef, createContext, useCallback, useEffect, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useReactiveLocalStorage } from 'app-shared/hooks/useReactiveLocalStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from './hooks/queries/useFormLayoutSettingsQuery';

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
  selectedLayout: string;
  setSelectedLayout: (layout: string) => void;
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
  const { data: instanceId } = useInstanceIdQuery(org, app);
  const [searchParams] = useSearchParams();
  const [selectedLayoutSet, setSelectedLayoutSet, removeSelectedLayoutSet] =
    useReactiveLocalStorage('layoutSet/' + app, null);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const layoutPagesOrder = formLayoutSettings?.pages.order;
  const [selectedLayout, setSelectedLayout, removeSelectedLayout] = useReactiveLocalStorage(
    instanceId,
    null,
  );
  const [invalidLayouts, setInvalidLayouts] = useState<string[]>([]);

  const searchParamsLayout = searchParams.get('layout');

  const isValidLayout = (layoutName: string): boolean => {
    const isExistingLayout = layoutPagesOrder?.includes(layoutName);
    const isReceipt = formLayoutSettings?.receiptLayoutName === layoutName;
    return isExistingLayout || isReceipt;
  };

  const selectedLayoutName = isValidLayout(searchParamsLayout) ? searchParamsLayout : undefined;

  /**
   * Set the correct selected layout based on url parameters
   */
  useEffect(() => {
    if (!selectedLayoutName) {
      removeSelectedLayout();
    } else {
      setSelectedLayout(selectedLayoutName);
    }
  }, [setSelectedLayout, selectedLayoutName, removeSelectedLayout]);

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
      selectedLayout,
      setSelectedLayout,
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
      selectedLayout,
      setSelectedLayout,
      invalidLayouts,
      setInvalidLayouts,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
