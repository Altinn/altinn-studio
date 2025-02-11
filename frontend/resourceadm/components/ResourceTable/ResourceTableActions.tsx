import React, { useRef, type ReactNode } from 'react';
import classes from './ResourceTable.module.css';
import { PencilIcon, FileImportIcon, TrashIcon } from '@studio/icons';
import { StudioButton, StudioModal, StudioSpinner } from '@studio/components';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { useTranslation } from 'react-i18next';

interface ResourceTableActionsProps {
  listItem: ResourceListItem;
  resourceName: string;
  onEditResource: (id: string) => void;
  onImportResource?: (id: string, environments: string[]) => void;
  onDeleteResource?: (id: string) => void;
  importResourceId?: string;
}

export const ResourceTableActions: React.FC<ResourceTableActionsProps> = ({
  listItem,
  resourceName,
  onEditResource,
  onImportResource,
  onDeleteResource,
  importResourceId,
}): ReactNode => {
  const { t } = useTranslation();
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const existsInGitea = listItem.environments.some((env: string) => env === 'gitea');
  const existsInProd = listItem.environments.some((env: string) => env === 'prod');

  const onCloseModal = (): void => {
    deleteModalRef.current.close();
  };

  const onClickDeleteResource = (): void => {
    deleteModalRef.current.showModal();
  };

  const onClickConfirmDeleteResource = (): void => {
    onCloseModal();
    onDeleteResource(listItem.identifier);
  };

  const deleteButton = !!onDeleteResource && !existsInProd && (
    <StudioButton
      variant='tertiary'
      color='danger'
      title={t('dashboard.resource_table_row_delete', {
        resourceName: resourceName,
      })}
      icon={<TrashIcon className={classes.actionButtonIcon} />}
      onClick={() => onClickDeleteResource()}
      size='medium'
    />
  );
  const editButton = existsInGitea && (
    <StudioButton
      variant='tertiary'
      title={t('dashboard.resource_table_row_edit', {
        resourceName: resourceName,
      })}
      icon={<PencilIcon className={classes.actionButtonIcon} />}
      onClick={() => onEditResource(listItem.identifier)}
      size='medium'
    />
  );
  const importSpinner = importResourceId === listItem.identifier && (
    <StudioSpinner spinnerTitle={t('dashboard.resource_table_row_importing')} />
  );
  const importButton = onImportResource && !existsInGitea && (
    <StudioButton
      variant='tertiary'
      title={t('dashboard.resource_table_row_import', {
        resourceName: resourceName,
      })}
      icon={<FileImportIcon className={classes.actionButtonIcon} />}
      onClick={() => onImportResource(listItem.identifier, listItem.environments)}
      size='medium'
    />
  );

  return (
    <div className={classes.actionButtonCell}>
      {deleteButton}
      {editButton}
      {importSpinner}
      {importButton}
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={deleteModalRef}
          onClose={onCloseModal}
          heading={t('resourceadm.dashboard_delete_resource_header')}
          closeButtonTitle={t('resourceadm.close_modal')}
          footer={
            <>
              <StudioButton onClick={onClickConfirmDeleteResource} color='danger'>
                {t('resourceadm.dashboard_delete_resource_confirm')}
              </StudioButton>
              <StudioButton onClick={onCloseModal} variant='tertiary'>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          {t('resourceadm.dashboard_delete_resource_body', { resourceName: resourceName })}
        </StudioModal.Dialog>
      </StudioModal.Root>
    </div>
  );
};
