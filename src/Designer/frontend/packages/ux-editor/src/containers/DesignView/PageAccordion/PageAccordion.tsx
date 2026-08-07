import type { MouseEvent, ReactNode } from 'react';
import classes from './PageAccordion.module.css';
import { NavigationMenu } from './NavigationMenu';
import { accordionHeaderId, pageAccordionContentId } from '@studio/testing/testids';
import { FilePdfIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks';
import { StudioButton, StudioDetails } from '@studio/components';
import { useDeletePageMutation } from '../../../hooks/mutations/useDeletePageMutation';
import { usePagesQuery } from 'app-shared/hooks/queries/usePagesQuery';
import { useChangePageGroupOrder } from '../../../hooks/mutations/useChangePageGroupOrder';
import { getUpdatedGroupsExcludingPage } from '../../../utils/designViewUtils/designViewUtils';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import { useTextResourceValue } from '../../../components/TextResource/hooks/useTextResourceValue';

import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export type PageAccordionProps = {
  pageId: string;
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  isInvalid?: boolean;
  hasDuplicatedIds?: boolean;
  pageIsPdf?: boolean;
  showNavigationMenu?: boolean;
  groupIndex?: number;
};

/**
 * @component
 *    Displays an accordion for a page, as well as a menu button where the user can
 *    move accordions, edit the name on them and delete them.
 *
 * @property {string}[pageId] - The id of the page
 * @property {ReactNode}[children] - The children of the component
 * @property {boolean}[isOpen] - If the accordion is open or not
 * @property {function}[onClick] - Function to execute when the accordion is clicked
 * @property {boolean}[pageIsPdf] - If the page is pdf or not
 *
 * @returns {ReactNode} - The rendered component
 */
export const PageAccordion = ({
  pageId,
  children,
  isOpen,
  onClick,
  isInvalid,
  hasDuplicatedIds,
  pageIsPdf,
  showNavigationMenu = true,
  groupIndex,
}: PageAccordionProps): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedItem, setSelectedItem } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const { data: pages } = usePagesQuery(org, app, layoutSet);
  const pageName = useTextResourceValue(pageId);
  const { mutate: deletePage, isPending } = useDeletePageMutation(org, app, layoutSet);
  const { mutate: changePageGroups } = useChangePageGroupOrder(org, app, layoutSet);

  // The open state is driven entirely by isOpen, so the native toggle is prevented to stop
  // Details from opening and closing the panel on its own before React updates.
  const handleSummaryClick = (event: MouseEvent<HTMLElement>): void => {
    event.preventDefault();
    onClick();
  };

  const isUsingGroups = isPagesModelWithGroups(pages);
  const handleConfirmDelete = () => {
    if (!confirm(t('ux_editor.page_delete_text'))) return;
    if (selectedItem?.id === pageId) setSelectedItem(null);

    if (isUsingGroups) {
      const updatedGroups = getUpdatedGroupsExcludingPage({
        pageId,
        groups: pages.groups,
        groupIndex,
      });
      changePageGroups({ ...pages, groups: updatedGroups });
    } else {
      deletePage(pageId);
    }
  };

  return (
    <div className={classes.accordionItem}>
      <StudioDetails open={isOpen} onToggle={onClick} className={classes.details}>
        <StudioDetails.Summary
          data-testid={accordionHeaderId(pageId)}
          onClick={handleSummaryClick}
          className={isInvalid || hasDuplicatedIds ? classes.accordionHeaderWarning : undefined}
        >
          {pageName || pageId}
        </StudioDetails.Summary>
        <StudioDetails.Content
          data-testid={pageAccordionContentId(pageId)}
          className={classes.accordionContent}
        >
          {children}
        </StudioDetails.Content>
      </StudioDetails>
      <div className={classes.navigationMenu}>
        {pageIsPdf && <FilePdfIcon className={classes.pdfIcon} />}
        {showNavigationMenu && <NavigationMenu pageName={pageId} />}
        <StudioButton
          icon={<TrashIcon aria-hidden />}
          onClick={handleConfirmDelete}
          title={t('general.delete_item', { item: pageName || pageId })}
          variant='tertiary'
          disabled={isPending}
        />
      </div>
    </div>
  );
};
