import React, { useCallback } from 'react';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@studio/icons';
import { useSearchParams } from 'react-router-dom';
import { useDeleteLayoutMutation } from '../../../../hooks/mutations/useDeleteLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks/useAppContext';
import { firstAvailableLayout } from '../../../../utils/formLayoutsUtils';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';

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
    <Button
      color='danger'
      icon={<TrashIcon />}
      onClick={handleConfirmDelete}
      title={t('general.delete')}
      variant='tertiary'
      size='small'
    />
  );
};
