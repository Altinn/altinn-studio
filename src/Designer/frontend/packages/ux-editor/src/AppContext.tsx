import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ItemType } from './components/Properties/ItemType';
import useUxEditorParams from './hooks/useUxEditorParams';
import { usePreviewContext } from 'app-shared/contexts/PreviewContext';
import {
  noPreviewComponentErrors,
  type PreviewComponentErrors,
} from './components/Preview/studioBridge';

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
  /** The errors that the app frontend in preview found in the components of the layout set it shows. */
  previewComponentErrors: PreviewComponentErrors;
  setPreviewComponentErrors: (errors: PreviewComponentErrors) => void;
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
  const { doReloadPreview } = usePreviewContext();
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);
  const [searchParams] = useSearchParams();
  const layout = searchParams.get('layout');

  const { selectedFormLayoutName, setSelectedFormLayoutName } =
    useSelectedFormLayoutName(layoutSet);

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(
    layout ? { type: ItemType.Page, id: layout } : null,
  );
  const [previewComponentErrors, setPreviewComponentErrors] =
    useState<PreviewComponentErrors>(noPreviewComponentErrors);

  // Preview runs on a domain of its own, where the editors can't reach the app frontend's queries, so they reload
  // the frame. The frame's session keeps the instance and its form data.
  const updateLayoutsForPreview = useCallback(async (): Promise<void> => {
    doReloadPreview();
  }, [doReloadPreview]);

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
      previewComponentErrors,
      setPreviewComponentErrors,
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
      previewComponentErrors,
      setPreviewComponentErrors,
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
