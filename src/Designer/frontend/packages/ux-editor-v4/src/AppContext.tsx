import type { MutableRefObject, ReactElement, ReactNode } from 'react';
import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { useSelectedFormLayoutName } from 'app-shared/hooks/useSelectedFormLayoutName';
import { usePreviewContext } from 'app-shared/contexts/PreviewContext';
import { postPreviewChange, type PreviewChange } from 'app-shared/utils/studioBridge';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageSpinner } from '@designer/components';
import { useTranslation } from 'react-i18next';
import type { ItemType } from './components/Properties/ItemType';
import useUxEditorParams from './hooks/useUxEditorParams';

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
  updateTextsForPreview: (language?: string, resetQueries?: boolean) => Promise<void>;
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
  selectedItem: SelectedItem | null;
  setSelectedItem: (selectedItem: SelectedItem | null) => void;
  /** The origin of the Studio bridge in the preview frame, once the page in the frame has said it is ready. */
  previewBridgeOriginRef: MutableRefObject<string | null>;
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
  const previewBridgeOriginRef = useRef<string | null>(null);
  const { doReloadPreview } = usePreviewContext();
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { isPending: pendingLayoutsets } = useLayoutSetsQuery(org, app);

  const { selectedFormLayoutName, setSelectedFormLayoutName } =
    useSelectedFormLayoutName(layoutSet);

  // Preview runs on a domain of its own, so the editor can't reach the app frontend's queries. The Studio bridge in the
  // frame has the frontend fetch changed layouts, page settings and texts again, which keeps the developer's place in
  // the form. A change that replaces what the frontend has, changed layout sets, and a frame without a ready bridge
  // reload the frame.
  const updatePreview = useCallback(
    (change: PreviewChange, resetQueries: boolean): void => {
      if (
        resetQueries ||
        !postPreviewChange(previewIframeRef.current, previewBridgeOriginRef.current, change)
      )
        doReloadPreview();
    },
    [doReloadPreview],
  );

  const updateLayoutsForPreview = useCallback(
    async (_layoutSetName: string, resetQueries: boolean = false): Promise<void> =>
      updatePreview({ type: 'layoutsChanged' }, resetQueries),
    [updatePreview],
  );

  const updateLayoutSetsForPreview = useCallback(async (): Promise<void> => {
    doReloadPreview();
  }, [doReloadPreview]);

  const updateLayoutSettingsForPreview = useCallback(
    async (_layoutSetName: string, resetQueries: boolean = false): Promise<void> =>
      updatePreview({ type: 'layoutSettingsChanged' }, resetQueries),
    [updatePreview],
  );

  const updateTextsForPreview = useCallback(
    async (_language?: string, resetQueries: boolean = false): Promise<void> =>
      updatePreview({ type: 'textsChanged' }, resetQueries),
    [updatePreview],
  );

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
      previewBridgeOriginRef,
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
