import type { ReactNode } from 'react';
import React, { useCallback } from 'react';
import classes from './PageAccordion.module.css';
import cn from 'classnames';
import { Accordion } from '@digdir/designsystemet-react';
import { NavigationMenu } from './NavigationMenu';
import { pageAccordionContentId } from '@studio/testing/testids';
import { TrashIcon } from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks/useAppContext';
import { firstAvailableLayout } from '../../../utils/formLayoutsUtils';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { useDeleteLayout } from './useDeleteLayout';

export type PageAccordionProps = {
  pageName: string;
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  pageIsReceipt?: boolean;
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
 * @property {boolean}[pageIsReceipt] - If the page is receipt or not
 *
 * @returns {ReactNode} - The rendered component
 */
export const PageAccordion = ({
  pageName,
  children,
  isOpen,
  onClick,
  pageIsReceipt,
}: PageAccordionProps): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout = searchParams.get('layout');

  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const layoutOrder = formLayoutSettings?.pages?.order;

  const { mutate: deleteLayout, isPending } = useDeleteLayout();

  const handleConfirmDelete = useCallback(() => {
    if (confirm(t('ux_editor.page_delete_text'))) {
      deleteLayout(pageName);
      if (selectedLayout === pageName) {
        const layoutToSelect = firstAvailableLayout(pageName, layoutOrder);
        setSearchParams({ layout: layoutToSelect });
      }
    }
  }, [deleteLayout, layoutOrder, pageName, selectedLayout, setSearchParams, t]);

  return (
    <Accordion.Item
      className={cn(classes.accordionItem, pageIsReceipt && classes.receiptItem)}
      open={isOpen}
    >
      <div className={classes.accordionHeaderRow}>
        <Accordion.Header className={classes.accordionHeader} level={3} onHeaderClick={onClick}>
          {pageName}
        </Accordion.Header>
        <div className={classes.navigationMenu}>
          <NavigationMenu pageName={pageName} pageIsReceipt={pageIsReceipt} />
          <StudioButton
            color='danger'
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
