import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@designer/components';
import { TrashIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useDeletePage } from '../../hooks/useDeletePage';
import { getPageTitle } from '../../utils/pageUtils';
import { DeleteDialog } from '../DeleteDialog/DeleteDialog';
import type { DeleteSelection } from '../DeleteDialog/DeleteDialog';
import { usePageEditing } from '../PageEditing/PageEditingContext';

export type DeletePageButtonProps = {
  /** Called after the page is deleted, so another page can be shown. */
  onPageDeleted: () => void;
};

/**
 * Deletes the page after asking what to remove with it, as deleting a component does: the texts and
 * data model fields only its components use.
 */
export function DeletePageButton({ onPageDeleted }: DeletePageButtonProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const { pageName, layout } = usePageEditing();
  const deletePage = useDeletePage();
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async ({ textKeys, fieldNames }: DeleteSelection): Promise<void> => {
    setIsDeleting(true);
    const isDeleted = await deletePage({
      pageName,
      textKeysToDelete: textKeys,
      fieldNamesToDelete: fieldNames,
    });
    setIsDeleting(false);
    // The dialog stays open when a step fails, so the user sees that something went wrong.
    if (isDeleted) {
      setIsDialogOpen(false);
      onPageDeleted();
    }
  };

  return (
    <>
      <StudioButton
        variant='tertiary'
        data-color='danger'
        data-size='sm'
        icon={<TrashIcon />}
        onClick={() => setIsDialogOpen(true)}
      >
        {t('app_builder.page.delete')}
      </StudioButton>
      {isDialogOpen && (
        <DeleteDialog
          title={t('app_builder.page.delete_title', { pageName: getPageTitle(pageName, texts) })}
          description={t('app_builder.page.delete_description')}
          components={layout.data.layout}
          // The page's name is a text with the page name as key.
          extraTextKeys={[pageName]}
          pageName={pageName}
          deletedPageName={pageName}
          isDeleting={isDeleting}
          onDelete={(selection) => void handleDelete(selection)}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}
