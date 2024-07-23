import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageAccordion.module.css';
import { Accordion } from '@digdir/designsystemet-react';
import { NavigationMenu } from './NavigationMenu';
import { pageAccordionContentId } from '@studio/testing/testids';
import { TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks';
import { StudioButton } from '@studio/components';
import { useDeleteLayoutMutation } from '../../../hooks/mutations/useDeleteLayoutMutation';

export type PageAccordionProps = {
  pageName: string;
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  isValid?: boolean;
  hasUniqueIds?: boolean;
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
 *
 * @returns {ReactNode} - The rendered component
 */
export const PageAccordion = ({
  pageName,
  children,
  isOpen,
  onClick,
  isValid,
  hasUniqueIds,
}: PageAccordionProps): ReactNode => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();

  const { mutate: deleteLayout, isPending } = useDeleteLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const handleConfirmDelete = () => {
    if (confirm(t('ux_editor.page_delete_text'))) {
      deleteLayout(pageName, {
        onSuccess: async ({ layouts }) => {
          await refetchLayouts(selectedFormLayoutSetName, Object.keys(layouts).length === 1);
        },
      });
    }
  };

  return (
    <Accordion.Item className={classes.accordionItem} open={isOpen}>
      <div className={classes.accordionHeaderRow}>
        <Accordion.Header
          className={
            isValid && hasUniqueIds ? classes.accordionHeader : classes.accordionHeaderWarning
          }
          level={3}
          onHeaderClick={onClick}
        >
          {pageName}
        </Accordion.Header>
        <div className={classes.navigationMenu}>
          <NavigationMenu pageName={pageName} />
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
        data-testid={pageAccordionContentId(pageName)}
        className={classes.accordionContent}
      >
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
};
