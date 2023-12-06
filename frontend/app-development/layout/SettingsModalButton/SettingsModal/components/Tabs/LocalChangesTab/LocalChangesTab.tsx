import React, { useRef } from 'react';
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
import { TabContent } from '../../TabContent';

export type LocalChangesTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the local changes for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {JSX.Element} - The rendered component
 */
export const LocalChangesTab = ({ org, app }: LocalChangesTabProps): JSX.Element => {
  const { t } = useTranslation();

  const { mutate: deleteLocalChanges } = useResetRepositoryMutation(org, app);

  const modalRef = useRef<HTMLDialogElement>(null);

  const handleDelete = () => {
    deleteLocalChanges(undefined, {
      onSuccess: () => {
        modalRef.current?.close();
        toast.success(t('settings_modal.local_changes_tab_deleted_success'));
      },
    });
  };

  const handleCloseModal = () => modalRef.current?.close();

  return (
    <TabContent>
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
          action={{ type: 'button', onClick: () => modalRef.current?.showModal() }}
        />
      </div>
      <DeleteModal
        ref={modalRef}
        onClose={handleCloseModal}
        onDelete={handleDelete}
        appName={app}
      />
    </TabContent>
  );
};
