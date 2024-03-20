import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageAccordion.module.css';
import cn from 'classnames';
import { Accordion } from '@digdir/design-system-react';
import { NavigationMenu } from './NavigationMenu';
import * as testids from '../../../../../../testing/testids';
import { TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutSetName } from '../../../hooks';
import { StudioButton } from '@studio/components';
import { useDeleteLayoutMutation } from '../../../hooks/mutations/useDeleteLayoutMutation';

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
  const { org, app } = useStudioUrlParams();
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();

  const { mutate: deleteLayout, isPending } = useDeleteLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const handleConfirmDelete = () => {
    if (confirm(t('ux_editor.page_delete_text'))) {
      deleteLayout(pageName);
    }
  };

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
            size='small'
            disabled={isPending}
          />
        </div>
      </div>
      <Accordion.Content
        data-testid={testids.pageAccordionContent(pageName)}
        className={classes.accordionContent}
      >
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
};
