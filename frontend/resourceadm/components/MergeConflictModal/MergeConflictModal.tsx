import React, { useState } from 'react';
import { toast } from 'react-toastify';
import classes from './MergeConflictModal.module.css';
import { useTranslation } from 'react-i18next';
import { Link, Paragraph, Label } from '@digdir/design-system-react';
import { repoDownloadPath } from 'app-shared/api/paths';
import { RemoveChangesModal } from './RemoveChangesModal';
import { Modal } from '../Modal';
import { StudioButton } from '@studio/components';
import { useResetRepositoryMutation } from 'resourceadm/hooks/mutations';

type MergeConflictModalProps = {
  /**
   * Boolean for if the modal is open
   */
  isOpen: boolean;
  /**
   * The name of the organisation
   */
  org: string;
  /**
   * The name of the repo
   */
  repo: string;
};

/**
 * @component
 *    Displays the modal telling the user that there is a merge conflict
 *
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {string}[org] - The name of the organisation
 * @property {string}[repo] - The name of the repo
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const MergeConflictModal = ({
  isOpen,
  org,
  repo,
}: MergeConflictModalProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [resetModalOpen, setResetModalOpen] = useState(false);

  const { mutate: resetRepo, isPending: isRemovingChanges } = useResetRepositoryMutation(org, repo);

  /**
   * Function that resets the repo
   */
  const handleClickResetRepo = () => {
    resetRepo(undefined, {
      onSuccess: () => {
        toast.success(t('overview.reset_repo_completed'));
        setResetModalOpen(false);
      },
    });
  };

  return (
    <Modal isOpen={isOpen} title={t('merge_conflict.headline')}>
      <Paragraph size='small'>{t('merge_conflict.body1')}</Paragraph>
      <Paragraph size='small'>{t('merge_conflict.body2')}</Paragraph>
      <div className={classes.buttonWrapper}>
        <div className={classes.downloadWrapper}>
          <Label size='medium' weight='medium'>
            {t('merge_conflict.download')}
          </Label>
          <Link href={repoDownloadPath(org, repo)}>
            {t('merge_conflict.download_edited_files')}
          </Link>
          <Link href={repoDownloadPath(org, repo, true)}>
            {t('merge_conflict.download_entire_repo')}
          </Link>
        </div>
        <StudioButton onClick={() => setResetModalOpen(true)} size='small'>
          {t('merge_conflict.remove_my_changes')}
        </StudioButton>
        <RemoveChangesModal
          isOpen={resetModalOpen}
          isRemovingChanges={isRemovingChanges}
          onClose={() => setResetModalOpen(false)}
          handleClickResetRepo={handleClickResetRepo}
          repo={repo}
        />
      </div>
    </Modal>
  );
};
