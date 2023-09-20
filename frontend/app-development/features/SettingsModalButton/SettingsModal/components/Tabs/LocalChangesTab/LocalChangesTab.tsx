import React, { ReactNode, useState } from 'react';
import classes from './LocalChangesTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Paragraph } from '@digdir/design-system-react';
import { DownloadIcon, TrashIcon } from '@navikt/aksel-icons';
import { LocalChangesActionButton } from './LocalChangesActionButton';
import { DeleteModal } from './DeleteModal';
import { useResetRepositoryMutation } from 'app-development/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';
import { repoDownloadPath } from 'app-shared/api/paths';

export type LocalChangesTabProps = {
  /**
   * The org
   */
  org: string;
  /**
   * The app
   */
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the local changes for an app
 *
 * @returns {ReactNode} - The rendered component
 */
export const LocalChangesTab = ({ org, app }: LocalChangesTabProps): ReactNode => {
  const { t } = useTranslation();

  const { mutate: deleteLocalChanges } = useResetRepositoryMutation(org, app);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDelete = () => {
    deleteLocalChanges(undefined, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        toast.success(t('settings_modal.local_changes_tab_deleted_success'));
      },
    });
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.local_changes_tab_heading')} />
      <div className={classes.contentWrapper}>
        <Paragraph size='small'>{t('settings_modal.local_changes_tab_info_text')}</Paragraph>
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_download_your_files_label')}
          description={t('settings_modal.local_changes_tab_download_your_files_description')}
          icon={<DownloadIcon className={classes.downloadIcon} />}
          text={t('settings_modal.local_changes_tab_download_only_changed_button')}
          action={{ type: 'link', href: repoDownloadPath(org, app) }}
        />
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_download_all_files_label')}
          description={t('settings_modal.local_changes_tab_download_all_files_description')}
          icon={<DownloadIcon className={classes.downloadIcon} />}
          text={t('settings_modal.local_changes_tab_download_all_button')}
          action={{ type: 'link', href: repoDownloadPath(org, app, true) }}
        />
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_delete_label')}
          description={t('settings_modal.local_changes_tab_delete_description')}
          color='danger'
          icon={<TrashIcon />}
          text={t('settings_modal.local_changes_tab_delete_button')}
          action={{ type: 'button', onClick: () => setDeleteModalOpen(true) }}
        />
      </div>
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDelete={handleDelete}
        appName={app}
      />
    </div>
  );
};
