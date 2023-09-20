import React, { ReactNode, useState } from 'react';
import classes from './LocalChangesTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Paragraph } from '@digdir/design-system-react';
import { DownloadIcon, TrashIcon } from '@navikt/aksel-icons';
import { LocalChangesActionButton } from './LocalChangesActionButton';
import { DeleteModal } from './DeleteModal';

export type LocalChangesTabProps = {
  appName: string;
};

/**
 * @component
 *    Displays the tab rendering the local changes for an app
 *
 * @returns {ReactNode} - The rendered component
 */
export const LocalChangesTab = ({ appName }: LocalChangesTabProps): ReactNode => {
  const { t } = useTranslation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDownload = () => {};
  const handleDelete = () => {};

  return (
    <div>
      <TabHeader text={t('settings_modal.local_changes_tab_heading')} />
      <div className={classes.contentWrapper}>
        <Paragraph size='small'>{t('settings_modal.local_changes_tab_info_text')}</Paragraph>
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_download_label')}
          description={t('settings_modal.local_changes_tab_download_description')}
          onClick={handleDownload}
          icon={<DownloadIcon />}
          text={t('settings_modal.local_changes_tab_download_only_changed_button')}
        />
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_download_label2')}
          description={t('settings_modal.local_changes_tab_download_description2')}
          onClick={handleDownload}
          icon={<DownloadIcon />}
          text={t('settings_modal.local_changes_tab_download_all_button')}
        />
        <LocalChangesActionButton
          label={t('settings_modal.local_changes_tab_delete_label')}
          description={t('settings_modal.local_changes_tab_delete_description')}
          onClick={() => setDeleteModalOpen(true)}
          color='danger'
          icon={<TrashIcon />}
          text={t('settings_modal.local_changes_tab_delete_button')}
        />
      </div>
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDelete={handleDelete}
        appName={appName}
      />
    </div>
  );
};
