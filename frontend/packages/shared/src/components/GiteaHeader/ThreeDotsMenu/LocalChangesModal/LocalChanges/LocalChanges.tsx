import type { ReactNode } from 'react';
import React, { useState } from 'react';
import classes from './LocalChanges.module.css';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '@digdir/design-system-react';
import { DownloadIcon, TrashIcon } from '@navikt/aksel-icons';
import { LocalChangesActionButton } from '../LocalChangesActionButton';
import { DeleteModal } from '../DeleteModal';
import { repoDownloadPath } from 'app-shared/api/paths';

export type LocalChangesProps = {
  org: string;
  app: string;
};

export const LocalChanges = ({ org, app }: LocalChangesProps): ReactNode => {
  const { t } = useTranslation();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <div className={classes.contentWrapper}>
      <Paragraph size='small'>{t('local_changes.modal_info_text')}</Paragraph>
      <LocalChangesActionButton
        label={t('local_changes.modal_download_your_files_label')}
        description={t('local_changes.modal_download_your_files_description')}
        icon={<DownloadIcon className={classes.downloadIcon} />}
        text={t('local_changes.modal_download_only_changed_button')}
        action={{ type: 'link', href: repoDownloadPath(org, app) }}
      />
      <LocalChangesActionButton
        label={t('local_changes.modal_download_all_files_label')}
        description={t('local_changes_modal.download_all_files_description')}
        icon={<DownloadIcon className={classes.downloadIcon} />}
        text={t('local_changes_modal.download_all_button')}
        action={{ type: 'link', href: repoDownloadPath(org, app, true) }}
      />
      <LocalChangesActionButton
        label={t('local_changes.modal_delete_label')}
        description={t('local_changes.modal_delete_description')}
        color='danger'
        icon={<TrashIcon />}
        text={t('local_changes.modal_delete_button')}
        action={{ type: 'button', onClick: () => setDeleteModalOpen(true) }}
      />
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        app={app}
        org={org}
      />
    </div>
  );
};
