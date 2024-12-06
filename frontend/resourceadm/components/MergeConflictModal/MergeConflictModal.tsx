import React, { forwardRef } from 'react';
import classes from './MergeConflictModal.module.css';
import { useTranslation } from 'react-i18next';
import { Link, Paragraph, Label, Modal } from '@digdir/designsystemet-react';
import { repoDownloadPath } from 'app-shared/api/paths';
import { StudioButton } from '@studio/components';
import { useResetRepositoryMutation } from '../../hooks/mutations';

type MergeConflictModalProps = {
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
 * @property {string}[org] - The name of the organisation
 * @property {string}[repo] - The name of the repo
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const MergeConflictModal = forwardRef<HTMLDialogElement, MergeConflictModalProps>(
  ({ org, repo }, ref): React.JSX.Element => {
    const { t } = useTranslation();

    const { mutate: resetRepo, isPending: isRemovingChanges } = useResetRepositoryMutation(
      org,
      repo,
    );

    /**
     * Function that resets the repo
     */
    const handleClickResetRepo = () => {
      resetRepo(undefined, {
        onSuccess: () => {
          window.location.reload();
        },
      });
    };

    return (
      <Modal ref={ref}>
        <Modal.Header closeButton={false}>{t('resourceadm.merge_conflict_header')}</Modal.Header>
        <Modal.Content>
          <Paragraph size='small' spacing>
            {t('resourceadm.merge_conflict_body')}
          </Paragraph>
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
        </Modal.Content>
        <Modal.Footer>
          <StudioButton
            onClick={() => {
              if (!isRemovingChanges) {
                handleClickResetRepo();
              }
            }}
          >
            {t('merge_conflict.remove_my_changes')}
          </StudioButton>
        </Modal.Footer>
      </Modal>
    );
  },
);

MergeConflictModal.displayName = 'MergeConflictModal';
