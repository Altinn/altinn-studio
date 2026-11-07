import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ItemType } from './components/Properties/ItemType';
import useUxEditorParams from './hooks/useUxEditorParams';
import { usePreviewContext } from 'app-shared/contexts/PreviewContext';
import { AppsQueryKey } from 'app-shared/types/AppsQueryKey';

export interface WindowWithQueryClient extends Window {
  queryClient?: QueryClient;
}

export type SelectedItem =
  | {
      type: ItemType.Group;
      id: number;
    }
  | {
      type: ItemType.Page;
      id: string;
    }
  | {
      type: ItemType.Component;
      id: string;
    };

export interface AppContextProps {
  previewIframeRef: MutableRefObject<HTMLIFrameElement>;
  selectedFormLayoutName: string;
  setSelectedFormLayoutName: (selectedFormLayoutName: string) => void;
  updateLayoutsForPreview: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  updateLayoutSetsForPreview: (resetQueries?: boolean) => Promise<void>;
  updateLayoutSettingsForPreview: (layoutSetName: string, resetQueries?: boolean) => Promise<void>;
  updateTextsForPreview: (language: string, resetQueries?: boolean) => Promise<void>;
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
  selectedItem: SelectedItem | null;
  setSelectedItem: (selectedItem: SelectedItem | null) => void;
}

export const AppContext = createContext<AppContextProps>(null);

type AppContextProviderProps = {
  children: React.ReactNode;
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
};

const layoutSearchParam = 'layout';
export const componentSearchParam = 'component';

const getInitialSelectedItem = (
  layout: string | null,
  component: string | null,
): SelectedItem | null => {
  if (component) return { type: ItemType.Component, id: component };
  if (layout) return { type: ItemType.Page, id: layout };
  return null;
};

export const AppContextProvider = ({
  children,
  shouldReloadPreview,
  previewHasLoaded,
  onLayoutSetNameChange,
}: AppContextProviderProps): React.JSX.Element => {
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const { doReloadPreview } = usePreviewContext();
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);
  const [searchParams, setSearchParams] = useSearchParams();
  const layout = searchParams.get(layoutSearchParam);
  const component = searchParams.get(componentSearchParam);

  const { selectedFormLayoutName } = useSelectedFormLayoutName(layoutSet);

  const [selectedItem, setSelectedItemState] = useState<SelectedItem | null>(
    getInitialSelectedItem(layout, component),
  );

  // Writes the page and drops the component in one update, because a second setSearchParams call in
  // the same event starts from the params of the last render and would undo the first.
  const setSelectedFormLayoutName = useCallback(
    (layoutName: string) => {
      setSearchParams((params) => {
        params.delete(componentSearchParam);
        if (layoutName) params.set(layoutSearchParam, layoutName);
        else params.delete(layoutSearchParam);
        params.sort();
        return params;
      });
    },
    [setSearchParams],
  );

  const setSelectedItem = useCallback(
    (item: SelectedItem | null) => {
      setSelectedItemState(item);
      if (item?.type !== ItemType.Component) return;
      setSearchParams(
        (params) => {
          params.set(componentSearchParam, item.id);
          params.sort();
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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
      return await refetch([AppsQueryKey.AppFormBootstrap], resetQueries);
    },
    [refetch],
  );

  const updateLayoutSetsForPreview = useCallback(async (): Promise<void> => {
    doReloadPreview();
  }, [doReloadPreview]);

  const updateLayoutSettingsForPreview = useCallback(async (): Promise<void> => {
    doReloadPreview();
  }, [doReloadPreview]);

  const updateTextsForPreview = useCallback(async (): Promise<void> => {
    doReloadPreview();
  }, [doReloadPreview]);

  const value = useMemo(
    () => ({
      previewIframeRef,
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      updateLayoutsForPreview,
      updateLayoutSetsForPreview,
      updateLayoutSettingsForPreview,
      updateTextsForPreview,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
      selectedItem,
      setSelectedItem,
    }),
    [
      selectedFormLayoutName,
      setSelectedFormLayoutName,
      updateLayoutsForPreview,
      updateLayoutSetsForPreview,
      updateLayoutSettingsForPreview,
      updateTextsForPreview,
      shouldReloadPreview,
      previewHasLoaded,
      onLayoutSetNameChange,
      selectedItem,
      setSelectedItem,
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
