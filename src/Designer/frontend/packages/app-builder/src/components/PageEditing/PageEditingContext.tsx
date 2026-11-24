import { createContext, useContext } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations/useUpsertTextResourcesMutation';
import { ComponentType } from 'app-shared/types/ComponentType';
import { EDITOR_LANGUAGE } from '../../constants';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useUpdateAttachmentDataTypeMutation } from '../../hooks/useAttachmentDataTypeMutations';
import { useSavePageLayoutMutation } from '../../hooks/useSavePageLayoutMutation';
import type { LayoutComponent, PageLayout } from '../../types';
import { toAttachmentDataType } from '../../utils/fileUploadUtils';
import {
  canMoveComponent,
  findComponent,
  moveComponent,
  updateComponent,
} from '../../utils/layoutUtils';
import { isManagedComponent } from '../../utils/pageUtils';

export type PageEditing = {
  pageName: string;
  layout: PageLayout;
  /** Whether this is the last page, which sums up the answers before the user submits them. */
  isSummaryPage: boolean;
  /**
   * The components the builder keeps in place and shows as a fixed part of the page, such as the
   * navigation buttons. New and moved components stay above them.
   */
  fixedIds: Set<string>;
  moveComponent: (componentId: string, offset: number) => void;
  canMoveComponent: (componentId: string, offset: number) => boolean;
  saveLayout: (layout: PageLayout) => void;
  /** Saves the page with the component replaced by what the update returns. */
  updateComponent: (
    componentId: string,
    update: (component: LayoutComponent) => LayoutComponent,
  ) => void;
  /** Saves app texts in the edited language. */
  saveTexts: (texts: Record<string, string>) => void;
};

const PageEditingContext = createContext<PageEditing | null>(null);

export type PageEditingProviderProps = PropsWithChildren<{
  pageName: string;
}>;

export function PageEditingProvider({
  pageName,
  children,
}: PageEditingProviderProps): ReactElement {
  const { org, app, layoutSetName, layouts, taskId, summaryPageName } = useAppBuilder();
  const { mutate: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);
  const { mutate: updateAttachmentDataType } = useUpdateAttachmentDataTypeMutation(org, app);
  const { mutate: upsertTextResources } = useUpsertTextResourcesMutation(org, app);
  const layout = layouts[pageName];
  const isSummaryPage = pageName === summaryPageName;
  const fixedIds = new Set(
    layout.data.layout
      .filter((component) => isManagedComponent(component, isSummaryPage))
      .map(({ id }) => id),
  );

  const saveLayout = (updatedLayout: PageLayout): void =>
    savePageLayout({ pageName, layout: updatedLayout });

  const value: PageEditing = {
    pageName,
    layout,
    isSummaryPage,
    fixedIds,
    moveComponent: (componentId, offset) =>
      saveLayout(moveComponent(layout, componentId, offset, fixedIds)),
    canMoveComponent: (componentId, offset) =>
      canMoveComponent(layout, componentId, offset, fixedIds),
    saveLayout,
    updateComponent: (componentId, update) => {
      const updatedLayout = updateComponent(layout, componentId, update);
      saveLayout(updatedLayout);
      // The backend checks uploads against the data type, so it follows the component's limits.
      const updated = findComponent(updatedLayout, componentId);
      if (updated?.type === ComponentType.FileUpload) {
        updateAttachmentDataType(toAttachmentDataType(updated, taskId));
      }
    },
    saveTexts: (texts) =>
      upsertTextResources({
        language: EDITOR_LANGUAGE,
        textResources: Object.entries(texts).map(([id, text]) => ({ id, value: text })),
      }),
  };

  return <PageEditingContext.Provider value={value}>{children}</PageEditingContext.Provider>;
}

export function usePageEditing(): PageEditing {
  const context = useContext(PageEditingContext);
  if (!context) throw new Error('usePageEditing must be used within a PageEditingProvider.');
  return context;
}
