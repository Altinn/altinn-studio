import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import React, { createContext, useCallback, useMemo, useRef } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useSelectedFormLayoutSetName } from 'app-shared/hooks/useSelectedFormLayoutSetName';
import { AppsQueryKey } from 'app-shared/types/AppsQueryKey';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutSetName: string;
  setSelectedFormLayoutSetName: (selectedFormLayoutSetName: string) => void;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (selectedFormLayoutName: string) => void;
  updateLayoutsForPreview: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  updateLayoutSettingsForPreview: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  updateTextsForPreview: (language: string, resetQueries?: boolean) => Promise<void>;
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

  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets, isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);

  const { selectedFormLayoutSetName, setSelectedFormLayoutSetName } =
    useSelectedFormLayoutSetName(layoutSets);

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

  const updateLayoutsForPreview = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppLayouts, layoutSetName], resetQueries);
    },
    [refetch],
  );

  const updateLayoutSettingsForPreview = useCallback(
    async (layoutSetName: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppLayoutSettings, layoutSetName], resetQueries);
    },
    [refetch],
  );

  const updateTextsForPreview = useCallback(
    async (language: string, resetQueries: boolean = false): Promise<void> => {
      return await refetch([AppsQueryKey.AppTextResources, language], resetQueries);
    },
    [refetch],
  );

  if (pendingLayoutsets) {
  }

  const value = useMemo(
    () => ({
      previewIframeRef,
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      updateLayoutsForPreview,
      updateLayoutSettingsForPreview,
      updateTextsForPreview,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    }),
    [
      selectedFormLayoutSetName,
      setSelectedFormLayoutSetName,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      updateLayoutsForPreview,
      updateLayoutSettingsForPreview,
      updateTextsForPreview,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      <ChildrenComponent pendingLayoutsets={pendingLayoutsets}>{children}</ChildrenComponent>
    </AppContext.Provider>
  );
};

type ChildrenComponentProps = {
  pendingLayoutsets: boolean;
  children: ReactNode;
};
const ChildrenComponent = ({
  pendingLayoutsets,
  children,
}: ChildrenComponentProps): ReactElement => {
  const { t } = useTranslation();

  if (pendingLayoutsets) {
    return <StudioPageSpinner spinnerTitle={t('ux_editor.loading_page')} />;
  }
  return <>{children}</>;
};
