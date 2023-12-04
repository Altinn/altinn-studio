import React, { useState } from 'react';
import classes from './DeletePopover.module.css';
import { Button, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@altinn/icons';
import { useSearchParams } from 'react-router-dom';
import { useDeleteLayoutMutation } from '../../../../hooks/mutations/useDeleteLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks/useAppContext';
import { firstAvailableLayout } from '../../../../utils/formLayoutsUtils';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { AltinnConfirmDialog } from 'app-shared/components';

export type DeletePopoverProps = {
  pageName: string;
};

/**
 * @component
 *    Displays a modal with the option to delete a page
 *
 * @property {string}[pageName] - The name of the page to delete
 *
 * @returns {JSX.Element} - The rendered component
 */
export const DeletePopover = ({ pageName }: DeletePopoverProps): JSX.Element => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { t } = useTranslation();

  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedLayoutSet);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout = searchParams.get('layout');
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const layoutOrder = formLayoutSettings?.pages.order;

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    deleteLayout(pageName);

    if (selectedLayout === pageName) {
      const layoutToSelect = firstAvailableLayout(pageName, layoutOrder);
      setSearchParams({ layout: layoutToSelect });
    }
  };

  const handleClose = () => setIsOpen((prevState) => !prevState);

  return (
    <AltinnConfirmDialog
      open={isOpen}
      confirmText={t('ux_editor.page_delete_confirm')}
      onConfirm={handleConfirmDelete}
      onClose={handleClose}
      trigger={
        <Button
          color='danger'
          icon={<TrashIcon />}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setIsOpen((prevState) => !prevState);
          }}
          title={t('general.delete')}
          variant='tertiary'
          size='small'
        />
      }
    >
      <div className={classes.popoverContent}>
        <Paragraph size='small'>{t('ux_editor.page_delete_text')}</Paragraph>
        <Paragraph size='small'>{t('ux_editor.page_delete_information')}</Paragraph>
      </div>
    </AltinnConfirmDialog>
  );
};
