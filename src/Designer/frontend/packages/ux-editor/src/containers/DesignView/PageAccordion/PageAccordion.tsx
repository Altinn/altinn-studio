import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageAccordion.module.css';
import { Accordion } from '@digdir/designsystemet-react';
import { NavigationMenu } from './NavigationMenu';
import { accordionHeaderId, pageAccordionContentId } from '@studio/testing/testids';
import { FilePdfIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks';
import { StudioButton } from '@studio/components';
import { useDeletePageMutation } from '../../../hooks/mutations/useDeletePageMutation';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import { useChangePageGroupOrder } from '../../../hooks/mutations/useChangePageGroupOrder';
import { getUpdatedGroupsExcludingPage } from '../../../utils/designViewUtils/designViewUtils';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import cn from 'classnames';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export type PageAccordionProps = {
  pageName: string;
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
 * @property {string}[pageName] - The name of the page
 * @property {ReactNode}[children] - The children of the component
 * @property {boolean}[isOpen] - If the accordion is open or not
 * @property {function}[onClick] - Function to execute when the accordion is clicked
 * @property {boolean}[pageIsPdf] - If the page is pdf or not
 *
 * @returns {ReactNode} - The rendered component
 */
export const PageAccordion = ({
  pageName,
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

  const { mutate: deletePage, isPending } = useDeletePageMutation(org, app, layoutSet);
  const { mutate: changePageGroups } = useChangePageGroupOrder(org, app, layoutSet);

  const isUsingGroups = isPagesModelWithGroups(pages);
  const handleConfirmDelete = () => {
    if (!confirm(t('ux_editor.page_delete_text'))) return;
    if (selectedItem?.id === pageName) setSelectedItem(null);

    if (isUsingGroups) {
      const updatedGroups = getUpdatedGroupsExcludingPage({
        pageId: pageName,
        groups: pages.groups,
        groupIndex,
      });
      changePageGroups({ ...pages, groups: updatedGroups });
    } else {
      deletePage(pageName);
    }
  };

  return (
    <Accordion.Item open={isOpen} className={classes.accordionItem}>
      <div className={classes.accordionHeaderRow}>
        <div
          data-testid={accordionHeaderId(pageName)}
          className={
            isInvalid || hasDuplicatedIds ? classes.accordionHeaderWarning : classes.accordionHeader
          }
        >
          <Accordion.Header level={3} onHeaderClick={onClick}>
            {pageName}
          </Accordion.Header>
        </div>
        <div className={cn(classes.navigationMenu, { [classes.accordionSelected]: isOpen })}>
          {pageIsPdf && <FilePdfIcon className={classes.pdfIcon} />}
          {showNavigationMenu && <NavigationMenu pageName={pageName} />}
          <StudioButton
            icon={<TrashIcon aria-hidden />}
            onClick={handleConfirmDelete}
            title={t('general.delete_item', { item: pageName })}
            variant='tertiary'
            disabled={isPending}
          />
        </div>
      </div>
      <Accordion.Content
        data-testid={pageAccordionContentId(pageName)}
        className={classes.accordionContent}
      >
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
};
